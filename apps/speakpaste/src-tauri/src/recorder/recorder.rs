use crate::recorder::wav_writer::WavWriter;
use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use cpal::{Device, SampleFormat, Stream};
use log::{debug, error, info};
use serde::Serialize;
use std::collections::VecDeque;
use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{mpsc, Arc};
use std::thread::{self, JoinHandle};

/// Simple result type using String for errors
pub type Result<T> = std::result::Result<T, String>;

/// Audio recording metadata - returned to frontend
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AudioRecording {
    pub audio_data: Vec<f32>, // Empty for file-based recording
    pub sample_rate: u32,
    pub channels: u16,
    pub duration_seconds: f32,
    pub file_path: Option<String>, // Path to the WAV file
}

/// Raw audio sample frames delivered from the audio callback
#[derive(Clone)]
pub enum AudioFrame {
    F32(Vec<f32>),
    I16(Vec<i16>),
    U16(Vec<u16>),
}

/// Messages sent to the WAV writer thread
pub enum WriterMessage {
    Frame(AudioFrame),
    Flush(mpsc::Sender<(u32, u16, f32)>),
}

/// Commands for the persistent warm worker thread
enum WorkerCmd {
    AttachWriter {
        writer_tx: crossbeam_channel::Sender<WriterMessage>,
        reply_tx: mpsc::Sender<()>,
    },
    Start(mpsc::Sender<()>),
    Stop(mpsc::Sender<()>),
    Shutdown,
}

/// Rolling circular buffer maintaining the most recent audio samples (e.g. 300 ms).
/// This ensures 0% first-word cutoff, prepending audio spoken during key debounce.
struct PreRollBuffer {
    frames: VecDeque<AudioFrame>,
    total_samples: usize,
    max_samples: usize,
}

impl PreRollBuffer {
    fn new(sample_rate: u32, duration_ms: u32) -> Self {
        let max_samples = (sample_rate as usize * duration_ms as usize) / 1000;
        Self {
            frames: VecDeque::new(),
            total_samples: 0,
            max_samples,
        }
    }

    fn push(&mut self, frame: AudioFrame) {
        let sample_count = match &frame {
            AudioFrame::F32(v) => v.len(),
            AudioFrame::I16(v) => v.len(),
            AudioFrame::U16(v) => v.len(),
        };
        self.total_samples += sample_count;
        self.frames.push_back(frame);

        while self.total_samples > self.max_samples && self.frames.len() > 1 {
            if let Some(old) = self.frames.pop_front() {
                let old_count = match &old {
                    AudioFrame::F32(v) => v.len(),
                    AudioFrame::I16(v) => v.len(),
                    AudioFrame::U16(v) => v.len(),
                };
                self.total_samples = self.total_samples.saturating_sub(old_count);
            }
        }
    }

    fn drain_into(&mut self, tx: &crossbeam_channel::Sender<WriterMessage>) {
        while let Some(frame) = self.frames.pop_front() {
            let _ = tx.try_send(WriterMessage::Frame(frame));
        }
        self.total_samples = 0;
    }

    fn clear(&mut self) {
        self.frames.clear();
        self.total_samples = 0;
    }
}

/// High-performance audio recorder with warm standby stream & instant pre-roll ring buffer
pub struct RecorderState {
    cmd_tx: Option<crossbeam_channel::Sender<WorkerCmd>>,
    worker_handle: Option<JoinHandle<()>>,
    writer_tx: Option<crossbeam_channel::Sender<WriterMessage>>,
    writer_thread_handle: Option<JoinHandle<()>>,
    is_recording: Arc<AtomicBool>,
    current_device_name: Option<String>,
    sample_rate: u32,
    channels: u16,
    file_path: Option<PathBuf>,
}

impl RecorderState {
    pub fn new() -> Self {
        Self {
            cmd_tx: None,
            worker_handle: None,
            writer_tx: None,
            writer_thread_handle: None,
            is_recording: Arc::new(AtomicBool::new(false)),
            current_device_name: None,
            sample_rate: 0,
            channels: 0,
            file_path: None,
        }
    }

    /// List available recording devices by name
    pub fn enumerate_devices(&self) -> Result<Vec<String>> {
        let host = cpal::default_host();
        let devices = host
            .input_devices()
            .map_err(|e| format!("Failed to get input devices: {}", e))?
            .filter_map(|device| device.name().ok())
            .collect();

        Ok(devices)
    }

    /// Pre-warm the CoreAudio input stream in the background.
    /// Once warm, starting a dictation takes < 1 ms with zero CoreAudio HAL blocking.
    pub fn warm_up(&mut self, device_name: &str, preferred_sample_rate: Option<u32>) -> Result<()> {
        if self.cmd_tx.is_some()
            && self.worker_handle.is_some()
            && self.current_device_name.as_deref() == Some(device_name)
        {
            // Already warm on this device
            return Ok(());
        }

        self.shutdown_worker();

        let host = cpal::default_host();
        let device = find_device(&host, device_name)?;
        let config = get_optimal_config(&device, preferred_sample_rate)?;
        let sample_format = config.sample_format();
        let sample_rate = config.sample_rate().0;
        let channels = config.channels();

        let stream_config = cpal::StreamConfig {
            channels,
            sample_rate: cpal::SampleRate(sample_rate),
            buffer_size: cpal::BufferSize::Default,
        };

        let (audio_tx, audio_rx) = crossbeam_channel::unbounded::<AudioFrame>();
        let (cmd_tx, cmd_rx) = crossbeam_channel::unbounded::<WorkerCmd>();
        let is_recording_flag = self.is_recording.clone();

        let worker = thread::spawn(move || {
            let stream = match build_input_stream(
                &device,
                &stream_config,
                sample_format,
                audio_tx,
            ) {
                Ok(s) => s,
                Err(e) => {
                    error!("[Recorder] Failed to build warm stream: {}", e);
                    return;
                }
            };

            if let Err(e) = stream.play() {
                error!("[Recorder] Failed to start warm stream: {}", e);
                return;
            }

            info!("[Recorder] Persistent audio stream warm on device ({} Hz, {} ch)", sample_rate, channels);

            let mut active_writer: Option<crossbeam_channel::Sender<WriterMessage>> = None;
            let mut preroll = PreRollBuffer::new(sample_rate, 300); // 300ms pre-roll window

            loop {
                crossbeam_channel::select! {
                    recv(cmd_rx) -> cmd => {
                        match cmd {
                            Ok(WorkerCmd::AttachWriter { writer_tx, reply_tx }) => {
                                active_writer = Some(writer_tx);
                                let _ = reply_tx.send(());
                            }
                            Ok(WorkerCmd::Start(reply_tx)) => {
                                is_recording_flag.store(true, Ordering::SeqCst);
                                if let Some(ref tx) = active_writer {
                                    // Flush pre-roll buffer immediately into WAV writer
                                    preroll.drain_into(tx);
                                }
                                let _ = reply_tx.send(());
                            }
                            Ok(WorkerCmd::Stop(reply_tx)) => {
                                is_recording_flag.store(false, Ordering::SeqCst);
                                active_writer = None;
                                preroll.clear();
                                let _ = reply_tx.send(());
                            }
                            Ok(WorkerCmd::Shutdown) | Err(_) => {
                                info!("[Recorder] Shutting down audio worker");
                                break;
                            }
                        }
                    }
                    recv(audio_rx) -> frame => {
                        if let Ok(frame) = frame {
                            if is_recording_flag.load(Ordering::Relaxed) {
                                if let Some(ref tx) = active_writer {
                                    let _ = tx.try_send(WriterMessage::Frame(frame));
                                }
                            } else {
                                preroll.push(frame);
                            }
                        }
                    }
                }
            }
        });

        self.cmd_tx = Some(cmd_tx);
        self.worker_handle = Some(worker);
        self.current_device_name = Some(device_name.to_string());
        self.sample_rate = sample_rate;
        self.channels = channels;

        Ok(())
    }

    /// Flush and clean up any leftover writer thread from a prior session
    fn cleanup_writer(&mut self) {
        if let Some(tx) = self.writer_tx.take() {
            let (reply_tx, reply_rx) = mpsc::channel();
            let _ = tx.send(WriterMessage::Flush(reply_tx));
            let _ = reply_rx.recv();
        }

        if let Some(handle) = self.writer_thread_handle.take() {
            let _ = handle.join();
        }
    }

    /// Full shutdown of background worker (used on app exit or device change)
    pub fn shutdown_worker(&mut self) {
        self.cleanup_writer();

        if let Some(tx) = self.cmd_tx.take() {
            let _ = tx.send(WorkerCmd::Shutdown);
        }

        if let Some(handle) = self.worker_handle.take() {
            let _ = handle.join();
        }

        self.current_device_name = None;
        self.sample_rate = 0;
        self.channels = 0;
        self.file_path = None;
    }

    /// Initialize recording session - reuses warm stream if already active (< 1 ms latency!)
    pub fn init_session(
        &mut self,
        device_name: String,
        output_folder: PathBuf,
        recording_id: String,
        preferred_sample_rate: Option<u32>,
    ) -> Result<()> {
        // Ensure output folder exists recursively
        std::fs::create_dir_all(&output_folder)
            .map_err(|e| format!("Failed to create output directory: {}", e))?;

        let file_path = output_folder.join(format!("{}.wav", recording_id));

        // Clean up prior writer
        self.cleanup_writer();

        // Ensure warm stream is running on the requested device
        self.warm_up(&device_name, preferred_sample_rate)?;

        // Create fresh WAV writer for this recording
        let mut writer = WavWriter::new(file_path.clone(), self.sample_rate, self.channels)
            .map_err(|e| format!("Failed to create WAV file: {}", e))?;

        let (writer_tx, writer_rx) = crossbeam_channel::unbounded::<WriterMessage>();

        let writer_thread_handle = thread::spawn(move || {
            for msg in writer_rx {
                match msg {
                    WriterMessage::Frame(AudioFrame::F32(data)) => {
                        let _ = writer.write_samples_f32(&data);
                    }
                    WriterMessage::Frame(AudioFrame::I16(data)) => {
                        let _ = writer.write_samples_i16(&data);
                    }
                    WriterMessage::Frame(AudioFrame::U16(data)) => {
                        let _ = writer.write_samples_u16(&data);
                    }
                    WriterMessage::Flush(reply_tx) => {
                        let _ = writer.finalize();
                        let _ = reply_tx.send(writer.get_metadata());
                        break;
                    }
                }
            }
        });

        // Attach new writer to running warm worker
        if let Some(ref tx) = self.cmd_tx {
            let (reply_tx, reply_rx) = mpsc::channel();
            tx.send(WorkerCmd::AttachWriter {
                writer_tx: writer_tx.clone(),
                reply_tx,
            })
            .map_err(|e| format!("Failed to attach writer to worker: {}", e))?;
            let _ = reply_rx
                .recv()
                .map_err(|e| format!("Worker failed to confirm writer attach: {}", e))?;
        }

        self.writer_tx = Some(writer_tx);
        self.writer_thread_handle = Some(writer_thread_handle);
        self.file_path = Some(file_path);

        debug!(
            "[Recorder] Session initialized: {} Hz, {} channels, file: {:?}",
            self.sample_rate, self.channels, self.file_path
        );

        Ok(())
    }

    /// Start recording - atomic trigger + immediate pre-roll dump to WAV (< 1 ms latency!)
    pub fn start_recording(&mut self) -> Result<()> {
        if let Some(tx) = &self.cmd_tx {
            let (reply_tx, reply_rx) = mpsc::channel();
            tx.send(WorkerCmd::Start(reply_tx))
                .map_err(|e| format!("Failed to send start command: {}", e))?;
            reply_rx
                .recv()
                .map_err(|e| format!("Failed to receive start confirmation: {}", e))?;
        } else {
            return Err("No recording session initialized".to_string());
        }
        Ok(())
    }

    /// Stop recording - returns WAV file metadata while keeping stream warm
    pub fn stop_recording(&mut self) -> Result<AudioRecording> {
        if let Some(tx) = &self.cmd_tx {
            let (reply_tx, reply_rx) = mpsc::channel();
            let _ = tx.send(WorkerCmd::Stop(reply_tx));
            let _ = reply_rx.recv();
        }

        let (sample_rate, channels, duration) = if let Some(tx) = self.writer_tx.take() {
            let (reply_tx, reply_rx) = mpsc::channel();
            let _ = tx.send(WriterMessage::Flush(reply_tx));
            reply_rx.recv().unwrap_or((self.sample_rate, self.channels, 0.0))
        } else {
            (self.sample_rate, self.channels, 0.0)
        };

        if let Some(handle) = self.writer_thread_handle.take() {
            let _ = handle.join();
        }

        let file_path = self
            .file_path
            .as_ref()
            .map(|p| p.to_string_lossy().to_string());

        info!("[Recorder] Recording finalized: {:.2}s, file: {:?}", duration, file_path);

        Ok(AudioRecording {
            audio_data: Vec::new(),
            sample_rate,
            channels,
            duration_seconds: duration,
            file_path,
        })
    }

    /// Cancel recording - stop and delete the file
    pub fn cancel_recording(&mut self) -> Result<()> {
        if let Some(tx) = &self.cmd_tx {
            let (reply_tx, reply_rx) = mpsc::channel();
            let _ = tx.send(WorkerCmd::Stop(reply_tx));
            let _ = reply_rx.recv();
        }

        self.cleanup_writer();

        if let Some(file_path) = &self.file_path {
            std::fs::remove_file(file_path).ok();
            debug!("[Recorder] Deleted cancelled recording file: {:?}", file_path);
        }

        self.file_path = None;
        Ok(())
    }

    /// Close session (keeps warm stream ready for next session)
    pub fn close_session(&mut self) -> Result<()> {
        self.cleanup_writer();
        self.file_path = None;
        Ok(())
    }

    /// Get current recording ID if actively recording
    pub fn get_current_recording_id(&self) -> Option<String> {
        if self.is_recording.load(Ordering::Acquire) {
            self.file_path
                .as_ref()
                .and_then(|path| path.file_stem())
                .and_then(|stem| stem.to_str())
                .map(|s| s.to_string())
        } else {
            None
        }
    }
}

/// Find a recording device by name
fn find_device(host: &cpal::Host, device_name: &str) -> Result<Device> {
    if device_name.to_lowercase() == "default" {
        return host
            .default_input_device()
            .ok_or_else(|| "No default input device available".to_string());
    }

    let devices: Vec<_> = host.input_devices().map_err(|e| e.to_string())?.collect();

    for device in devices {
        if let Ok(name) = device.name() {
            if name == device_name {
                return Ok(device);
            }
        }
    }

    Err(format!("Device '{}' not found", device_name))
}

/// Get optimal configuration for voice recording (cached and called only on warm-up)
fn get_optimal_config(
    device: &Device,
    preferred_sample_rate: Option<u32>,
) -> Result<cpal::SupportedStreamConfig> {
    let target_sample_rate = preferred_sample_rate.unwrap_or(16000);

    let configs: Vec<_> = device
        .supported_input_configs()
        .map_err(|e| e.to_string())?
        .collect();

    if configs.is_empty() {
        return Err("No supported input configurations".to_string());
    }

    let supported_formats = [SampleFormat::F32, SampleFormat::I16, SampleFormat::U16];
    let compatible_configs: Vec<_> = configs
        .iter()
        .filter(|config| supported_formats.contains(&config.sample_format()))
        .collect();

    if compatible_configs.is_empty() {
        return Err("No configurations with supported sample formats (F32, I16, U16)".to_string());
    }

    for config in &compatible_configs {
        if config.channels() == 1 {
            let min_rate = config.min_sample_rate().0;
            let max_rate = config.max_sample_rate().0;
            if min_rate <= target_sample_rate && max_rate >= target_sample_rate {
                return Ok(config.with_sample_rate(cpal::SampleRate(target_sample_rate)));
            }
        }
    }

    for config in &compatible_configs {
        let min_rate = config.min_sample_rate().0;
        let max_rate = config.max_sample_rate().0;
        if min_rate <= target_sample_rate && max_rate >= target_sample_rate {
            return Ok(config.with_sample_rate(cpal::SampleRate(target_sample_rate)));
        }
    }

    let mut best_config = None;
    let mut best_diff = u32::MAX;

    for config in &compatible_configs {
        if config.channels() == 1 {
            let min_rate = config.min_sample_rate().0;
            let max_rate = config.max_sample_rate().0;

            let closest_rate = if target_sample_rate < min_rate {
                min_rate
            } else if target_sample_rate > max_rate {
                max_rate
            } else {
                target_sample_rate
            };

            let diff = (closest_rate as i32 - target_sample_rate as i32).abs() as u32;
            if diff < best_diff {
                best_diff = diff;
                best_config = Some(config.with_sample_rate(cpal::SampleRate(closest_rate)));
            }
        }
    }

    if best_config.is_none() && !compatible_configs.is_empty() {
        let config = compatible_configs[0];
        let min_rate = config.min_sample_rate().0;
        let max_rate = config.max_sample_rate().0;
        let rate = if min_rate <= target_sample_rate && max_rate >= target_sample_rate {
            target_sample_rate
        } else {
            min_rate
        };
        best_config = Some(config.with_sample_rate(cpal::SampleRate(rate)));
    }

    best_config.ok_or_else(|| "Failed to find suitable audio configuration".to_string())
}

/// Build input stream with direct non-blocking crossbeam channel push
fn build_input_stream(
    device: &Device,
    config: &cpal::StreamConfig,
    sample_format: SampleFormat,
    audio_tx: crossbeam_channel::Sender<AudioFrame>,
) -> Result<Stream> {
    let err_fn = |err| error!("[Recorder] Audio stream error: {}", err);

    let stream = match sample_format {
        SampleFormat::F32 => {
            let tx = audio_tx;
            device.build_input_stream(
                config,
                move |data: &[f32], _: &_| {
                    let _ = tx.try_send(AudioFrame::F32(data.to_vec()));
                },
                err_fn,
                None,
            )
        }
        SampleFormat::I16 => {
            let tx = audio_tx;
            device.build_input_stream(
                config,
                move |data: &[i16], _: &_| {
                    let _ = tx.try_send(AudioFrame::I16(data.to_vec()));
                },
                err_fn,
                None,
            )
        }
        SampleFormat::U16 => {
            let tx = audio_tx;
            device.build_input_stream(
                config,
                move |data: &[u16], _: &_| {
                    let _ = tx.try_send(AudioFrame::U16(data.to_vec()));
                },
                err_fn,
                None,
            )
        }
        _ => return Err(format!("Unsupported sample format: {:?}", sample_format)),
    }
    .map_err(|e| format!("Failed to build input stream: {}", e))?;

    Ok(stream)
}

impl Drop for RecorderState {
    fn drop(&mut self) {
        self.shutdown_worker();
    }
}
