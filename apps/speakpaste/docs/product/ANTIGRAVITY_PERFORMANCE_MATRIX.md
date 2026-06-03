# SpeakPaste Performance Matrix

This document outlines the performance matrix and ongoing measurement framework for SpeakPaste. It defines operational metrics, test scenarios, measurement methodologies, and release gates to ensure the full local voice-to-cursor loop remains highly reliable as the codebase evolves.

---

## 1. Goals

* **Zero-Friction Dictation**: Maintain an instantaneous transition from keyboard trigger to active capture.
* **Offline Sovereignty**: Ensure all audio acquisition, Whisper matrix decoding, and cursor pasting execute 100% locally on this Mac, with zero network reliance or cloud telemetry leak risks.
* **Whisper Hallucination Suppression**: Mathematically audit and suppress whisper.cpp trailing hallucinations in silent or noisy tails.
* **Immunity to AppNap & Sleep**: Guarantee the background runtime listener intercepts global key flags and pastes reliably regardless of browser view focus or window visibility.

---

## 2. Core User Journeys

We trace and measure 11 core user journeys:

1. **Manual Fn Dictation (Foreground)**: User has the settings window open, presses and holds the Fn key, speaks a sentence, and releases the Fn key.
2. **Manual Fn Dictation (Hidden Window)**: Same as above, but with the settings window closed/minimized and the app running solely in the macOS status menu bar.
3. **Fallback Shortcut Dictation**: User triggers dictation using the configured global hotkey (e.g., `Cmd+Shift+F8`) instead of the Fn key.
4. **Noisy-Room Dictation**: User dictates in an environment with high ambient background noise (e.g., cafe chatter, street noise, music).
5. **Low-Level Background Noise Tail (No Speech)**: User triggers dictation, does not speak, lets ambient noise (e.g., HVAC hum, computer fan) record, and stops recording.
6. **Short Utterance Dictation**: User dictating single-word commands or very short phrases (e.g., "Yes.", "Copy that.", "Approved").
7. **Long Utterance Dictation**: User dictating continuously for up to 30 seconds (e.g., composing emails or long paragraphs).
8. **Paste into Chat Field**: Dictation target is a rapid chat input field (e.g., Slack, iMessage, Discord, WhatsApp Web).
9. **Paste into Text Editor**: Dictation target is a native document text view (e.g., Apple Notes, TextEdit, VS Code, Google Docs).
10. **Settings Change Live-Sync**: User changes fallback shortcuts or local technology profiles in Svelte, triggering on-the-fly Rust global shortcut reloads.
11. **Restart Persistence**: User quits SpeakPaste, restarts the app, and triggers global hotkeys immediately without opening configuration windows.

---

## 3. Performance Dimensions

We categorize measurements into 12 core performance dimensions:

1. **System Latency**: Delays across the recording-to-paste execution path.
2. **Transcription Accuracy**: Fidelity of speech-to-text conversion.
3. **Trailing Hallucination Rate**: Frequency of Whisper appending extra words during silence or background noise.
4. **False Trigger / False Paste Rate**: Accidental dictation runs triggered by unintended keystrokes or random audio spikes.
5. **Paste Success Rate**: Keystroke emulation reliability into focused fields.
6. **Background-Runtime Reliability**: Listener stability under macOS AppNap and window sleep constraints.
7. **CPU Resource Footprint**: Average and peak processor consumption during CPAL recording and Whisper inference.
8. **Memory Overhead**: RAM allocations, heap deltas, and model cache lifetimes.
9. **Battery & Thermal Impact**: Efficiency on portable Mac devices.
10. **Model Load Overhead**: Disk-to-RAM transition delays during warm vs cold launches.
11. **Cold Start vs Warm Start Latency**: Performance of first dictation run vs subsequent dictations.
12. **Hardware Compatibility**: Behavioral differences across Intel Macs, M-series basic chips, and M-series Pro/Max/Ultra configurations.

---

## 4. Metrics Table

| Metric Name | Why It Matters | Exact Definition | Unit | Collection Method | Target | Warning Limit | Blocker Limit |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Trigger Latency ($L_{trig}$)** | Ensures immediate recording feedback. | Time elapsed between `Fn key down` event and CPAL audio capture stream start. | ms | Log timestamp delta in Rust FFI. | $< 80$ | $> 120$ | $> 200$ |
| **Speech-to-Text inference duration ($L_{inf}$)** | Controls post-speech transcription wait. | Time whisper.cpp spends running matrix calculations on the captured WAV buffer. | ms | Rust `transcribe_audio_whisper` telemetry. | $< 250$ | $> 500$ | $> 1000$ |
| **Paste Latency ($L_{paste}$)** | Prevents user focusing elsewhere before text arrives. | Time from transcript output available to Enigo completing cursor paste keystrokes. | ms | Rust paste completion telemetry log. | $< 150$ | $> 300$ | $> 500$ |
| **End-to-End Latency ($L_{e2e}$)** | Total dictation-to-cursor cycle time. | Time from `Fn key up` event to final pasted character insertion. | ms | Sum of $L_{inf}$ and $L_{paste}$. | $< 500$ | $> 900$ | $> 1500$ |
| **Warm-Model Transcription Latency ($T_{trans\_warm}$)** | Keeps subsequent runs instant. | Inference latency when model is cached in memory. | ms | Rust model cache retrieval telemetry. | $< 250$ | $> 500$ | $> 1000$ |
| **Cold-Model Transcription Latency ($T_{trans\_cold}$)** | Delays first dictation run. | Inference latency on first trigger including loading model. | ms | Rust model cache load telemetry. | $< 1200$ | $> 2000$ | $> 3500$ |
| **Word Error Rate ($WER$)** | Directly defines accuracy. | $(Insertions + Deletions + Substitutions) / Words\ in\ Reference$. | % | Structured manual audio corpus tests. | $< 5\%$ | $> 8\%$ | $> 15\%$ |
| **Trailing Hallucination Frequency ($F_{hall}$)** | Prevents junk additions (e.g. "Thanks for watching!"). | % of sessions with trailing words decoded after the user stopped speaking. | % | Automated regex check on silent test audio. | $< 1\%$ | $> 3\%$ | $> 8\%$ |
| **Sessions with Extra Words ($S_{extra}$)** | Captures hallucination rate during speech. | % of speech dictations containing extra non-spoken words appended to the transcript. | % | Automated test comparison with reference transcript. | $< 2\%$ | $> 5\%$ | $> 10\%$ |
| **Silence Trigger Rate ($S_{sil\_text}$)** | Avoids blank triggers creating random text. | % of runs where 2 seconds of pure ambient noise produces text. | % | Automated batch silence verification tests. | $< 0.5\%$ | $> 2\%$ | $> 5\%$ |
| **Average Extra Trailing Tokens ($N_{trail}$)** | Measures severity of hallucination loops. | Number of extra trailing tokens generated in sessions that have hallucinations. | tokens | Log extraction of decoded token sizes. | $< 2$ | $> 4$ | $> 8$ |
| **Utterance-End Precision ($P_{end}$)** | Confirms accurate voice cut-offs. | Time difference between user's voice ending and engine detecting end of transcription. | ms | Audio segment analysis comparing user stop with engine stop. | $< 300$ | $> 600$ | $> 1200$ |
| **Paste Failure Rate ($R_{pf}$)** | Ensures cursor delivery works. | % of pastes where characters fail to appear in target editor. | % | Manual testing on top 5 target editors. | $0\%$ | $> 1\%$ | $> 3\%$ |
| **Hidden-Window Success Rate ($R_{bg}$)** | Confirms AppNap immunity. | % of successful paste loops executed with Svelte UI closed. | % | Manual / Automated FFI trigger tests. | $100\%$ | $< 99\%$ | $< 95\%$ |
| **CPU Average Recording ($CPU_{rec\_avg}$)** | Avoids background drain during recording. | Average CPU utilization of the audio capture thread. | % | OS activity diagnostics during recording. | $< 5\%$ | $> 10\%$ | $> 15\%$ |
| **CPU Peak Recording ($CPU_{rec\_peak}$)** | Limits peak capture overhead. | Peak CPU utilization of the audio capture thread. | % | OS activity diagnostics during recording. | $< 10\%$ | $> 15\%$ | $> 25\%$ |
| **CPU Average Inference ($CPU_{inf\_avg}$)** | Limits background CPU during matrix compute. | Average CPU utilization during whisper.cpp matrix calculations. | % | OS activity diagnostics during transcription. | $< 100\%$ | $> 200\%$ | $> 300\%$ |
| **CPU Peak Inference ($CPU_{inf\_peak}$)** | Avoids UI stuttering on other apps. | Maximum CPU core utilization during whisper.cpp matrix calculations. | % | OS activity diagnostics during transcription. | $< 150\%$ | $> 300\%$ | $> 400\%$ |
| **RAM Heap Delta ($\Delta RAM$)** | Prevents background memory leaks. | Increase in application resident set size (RSS) per 10 dictation runs. | MB | Node / Rust heap allocation tracking. | $< 5$ | $> 20$ | $> 50$ |
| **Model Load Time by Engine ($T_{load}$)** | Benchmarks disk-to-RAM transition. | Time taken to load the Whisper/Moonshine model on clean boot. | ms | Rust model cache load telemetry. | $< 150$ | $> 300$ | $> 1000$ |
| **Permission Friction Count ($N_{perm}$)** | Measures onboarding success. | Count of manual steps needed to enable microphone and accessibility. | count | Manual first-run UX audit. | $2$ | $3$ | $> 4$ |

---

## 5. Test Matrix

To benchmark SpeakPaste, run tests across the following variables:

```text
Test Suite
├── 1. Hardware Class
│   ├── Apple Silicon (M1/M2/M3, Pro/Max/Ultra/Basic)
│   └── Intel Macs (x86_64 Core i5/i7/i9)
├── 2. macOS Version
│   ├── macOS 15 Sequoia (Apple Intelligence Active)
│   ├── macOS 14 Sonoma
│   └── macOS 13 Ventura
├── 3. Audio Inputs
│   ├── MacBook Built-in Mic Array (focused beamforming)
│   └── External USB Microphone / Bluetooth Headset (compressed audio)
├── 4. Acoustic Environment
│   ├── Quiet Room (Ambient noise < 30 dB)
│   ├── Office Room (Keyboard clicks, distant talking, hums < 50 dB)
│   └── Noisy Cafe (Loud ambient talking, music > 60 dB)
├── 5. Silence Tail Condition
│   ├── Abrupt Stop (Immediate trigger release upon speaking stop)
│   ├── 500ms Silence Tail (Delay before release)
│   ├── 1000ms Silence Tail with HVAC/Fan Hum
│   └── Keyboard Clatter Tail (Typing noise immediately follows speech)
├── 6. Utterance Scale
│   ├── Short (1 - 3 words)
│   ├── Medium (1 - 2 sentences)
│   └── Long (Paragraph, 30+ seconds continuous)
├── 7. Engine & Model Profile
│   ├── Whisper C++ (ggml-tiny.en.bin, ggml-base.en.bin)
│   ├── Parakeet ONNX (INT8 quantized)
│   └── Moonshine ONNX (tiny-en, base-en)
└── 8. Active Target Applications
    ├── Chat / Text Fields (Slack, Apple Messages, Web input fields)
    └── Native Text Editors (Apple Notes, TextEdit, VS Code)
```

### Hardware Profiling & Cross-Platform Benchmarking Toolchain

To ensure consistent performance across Apple Silicon (basic/Pro/Max) and Intel hardware architectures, engineers should utilize the following macOS-native toolchain to record metrics:

#### A. Memory & CPU Bottleneck Analysis (`xctrace`)
Use the command-line utility for Xcode Instruments (`xctrace`) to run diagnostic profiling sessions programmatically and record traces:
* **List available templates**:
  ```bash
  xcrun xctrace list templates
  ```
* **Profile CPU Bottlenecks (Time Profiler)**:
  Launch the compiled binary in standard profile mode to record CPU call trees:
  ```bash
  xcrun xctrace record --template 'Time Profiler' --launch -- /Applications/SpeakPaste.app
  ```
* **Profile Memory Leak & Allocations (Allocations)**:
  Track heap footprint growth and detect leaks over successive dictation cycles:
  ```bash
  xcrun xctrace record --template 'Allocations' --launch -- /Applications/SpeakPaste.app
  ```
* **Process Trace Results**:
  Open the recorded output in the Xcode Instruments app for interactive visualization:
  ```bash
  open launch-*.trace
  ```

#### B. Thermal & Energy Gating (`powermetrics`)
Different hardware tiers (e.g. fanless M-series MacBook Air vs. actively-cooled Mac Studio or Intel MacBooks) experience differing thermal throttling behaviors during local whisper.cpp matrix calculations. Use the low-level `powermetrics` tool to monitor raw hardware energy impact:
* **Measure SoC Power Draw and Thermal Headroom** (Requires `sudo`):
  ```bash
  sudo powermetrics --samplers cpu_power,gpu_power,thermal -i 1000 -n 60
  ```
* **Visual Apple Silicon Monitors**:
  For readable real-time CPU/GPU core utilization, memory bandwidth, and temperature tracking on Apple Silicon, use tools like `asitop` or `macmon`:
  ```bash
  # Install and run terminal-based monitoring dashboards
  pip install asitop && sudo asitop
  # Or Rust-based macmon
  brew install macmon && macmon
  ```

#### C. Automated Architecture Benchmarking via `XCTest`
Write Xcode performance tests targeting the application's Swift/Rust FFI layer to enforce system metrics constraints:
* Set up a test suite using `XCTMetric` to profile operations on target hardware:
  ```swift
  func testDictationInferencePerformance() {
      let options = XCTMeasureOptions()
      options.iterationCount = 5
      
      measure(metrics: [XCTCPUMetric(), XCTMemoryMetric(), XCTClockMetric()], options: options) {
          // Trigger Rust transcription command via FFI wrapper
          runInferenceBenchmark()
      }
  }
  ```
* Execute the target test scheme on connected Intel (`x86_64`) or Apple Silicon (`arm64`) execution destinations:
  ```bash
  xcodebuild test -project SpeakPaste.xcodeproj -scheme SpeakPasteTests -destination 'platform=macOS,arch=arm64'
  ```

---


## 6. Measurement Methodology

We structure measurements into five key categories:

### A. Automated On-Device Instrumentation
The app registers log telemetry directly to the local filesystem. Every time a dictation loop completes, the Rust backend writes latency and performance metrics to local log structures:
* CPAL logs trigger down to audio open timestamps.
* `transcribe-rs` measures precise inference times and Whisper performance metrics.
* Enigo logs paste-complete timestamps.
These logs are aggregated locally in `~/Library/Logs/com.speakpaste.app/telemetry.log` for developer diagnostics.

### B. Manual QA Protocol
Because OS permissions and focus target fields are owned outside the app sandbox, the developer must run manual verification tests:
1. Revoke Accessibility permissions, boot the app, and verify onboarding dialog displays.
2. Open target editors (e.g. Slack, Apple Notes) and trigger dictations, visually verifying paste alignment and fallback copy presence.

### C. Antigravity Benchmarking
Antigravity executes automated terminal benchmarks on the local repository before release packaging:
* Compiles the app with `--offline` configurations.
* Runs Svelte settings schema tests and checks FFI command binds.
* Performs ripgrep scans to confirm no tracking telemetry is present.

### D. Recurring Regression Checks
All performance tests are run against the primary profiles (`balanced`, `intel-fast`, and `apple-silicon-accuracy`) to assert that updating models or Svelte configurations doesn't increase latency or trigger memory leaks.

### E. Trailing Hallucination Mitigation Layers
Whisper C++ models are susceptible to generating hallucinated repeating text (e.g., *"Thank you for watching!"*, *"Bye"* or repetitive punctuation) when recording ends with trailing silence or hums. We compare three mitigation layers:

| Layer | Performance Cost | Implementation Complexity | Quality Gain |
| :--- | :--- | :--- | :--- |
| **1. Decode-Parameter Tuning** | 🟢 **Negligible ($< 1$ ms)** | 🟢 **Low**: Adjust temperature fallback and threshold settings in whisper.cpp FFI. | 🟡 **Moderate**: Suppresses common loops but fails in loud background noise. |
| **2. Local Post-Processing** | 🟢 **Very Low ($< 2$ ms)** | 🟡 **Medium**: String comparison filters, stripping repeating patterns or common Whisper hallucination dictionary tokens. | 🟢 **High**: Highly effective at catching repeating sentences and cleaning output. |
| **3. Capture-Path Improvement** | 🔴 **High (CPU/RAM overhead)** | 🔴 **High**: Integrate native macOS `CoreAudio` noise suppression, voice isolation, or VAD gating. | 🚀 **Excellent**: Stops noise before it enters the transcription engine, providing a clean input. |

---

## 7. Alert Thresholds

| Alert Level | Trigger Condition | System Behavior |
| :--- | :--- | :--- |
| ⚠️ **Warning** | * $L_{e2e} > 900$ ms<br>* $F_{hall} > 3\%$ of runs<br>* Memory heap leak $> 20$ MB/10 runs | Post notification inside the Settings debug tab. Trigger log warning. No crash. |
| 🚨 **Blocker** | * $L_{e2e} > 1500$ ms<br>* $F_{hall} > 8\%$ of runs<br>* Paste failure rate $> 3\%$<br>* Background trigger fails completely | Prevent production packaging. Highlight blocker in verification logs. |

---

## 8. Release Gates

To certify a build for release, it must satisfy the following gates:

1. **Gate 1: End-to-End Latency**: The average $L_{e2e}$ must remain under 600ms on Apple Silicon Macs using the `balanced` performance profile.
2. **Gate 2: Hidden-Window Stability**: The background listener must capture shortcuts and paste transcripts with 100% reliability when Svelte's browser view is hidden.
3. **Gate 3: Telemetry Isolation**: A complete grep sweep must prove 100% compliance with local-only policies (zero outbound telemetry checks or remote provider endpoints).
4. **Gate 4: Model Cache Integrity**: Model load overhead must resolve in under 2ms for all subsequent warm triggers ($T_{warm}$ verification).

---

## 9. Recommended Instrumentation Additions

To support ongoing performance evaluation, we recommend adding the following local, non-telemetric instrumentation layers:

1. **FFI-Level Performance Timestamps**: Implement automated `std::time::Instant` measurements in Rust Tauri commands for audio capture start, inference duration, and paste completion. Write these metrics directly to `~/Library/Logs/com.speakpaste.app/telemetry.log`.
2. **Local Session Counters**: Store persistent local session counts and successful pastes to compute historical averages on-device without telemetry.
3. **Log Rotation & Pruning**: Ensure log directories are size-capped to prevent unbounded local file growth.
4. **Offline Benchmarking Suite**: A headless binary or command line flag (e.g. `--benchmark`) inside `src-tauri` that feeds pre-recorded WAV samples to the Whisper engine and outputs latency, accuracy, and hallucination scores.

---

## 10. Suggested Weekly Benchmark Ritual

Every Friday, the engineering team should execute this 15-minute diagnostic benchmark to verify product quality:

```markdown
- [ ] **1. Clean Installation Sweep**:
      - Delete `~/Library/Application Support/com.speakpaste.app` configs.
      - Install the latest release `.app` bundle from the main branch.
      - Open the app and verify the microphone and accessibility permission modals trigger correctly.
- [ ] **2. Diagnostic Performance Runs**:
      - Open Apple Notes, hold Fn, say: "Testing SpeakPaste local transcription velocity."
      - Verify paste succeeds, and check `telemetry.log` for latency parameters:
        - Confirm L_trig < 80ms, L_inf < 250ms, and L_paste < 150ms.
- [ ] **3. Silence & Noise Audit**:
      - Hold Fn, keep silent for 3 seconds in a room with background noise, and release.
      - Verify no text is pasted and clipboard remains clean (checks silence triggers).
      - Verify no trailing hallucinations (like "Thanks for watching!") are appended.
- [ ] **4. Live Config reload validation**:
      - Open Settings, change fallback trigger shortcut.
      - Verify new hotkey functions immediately without restarting the application.
- [ ] **5. Log Aggregation check**:
      - Inspect local logs to confirm zero network failures or outbound socket calls are reported during the runs.
```
