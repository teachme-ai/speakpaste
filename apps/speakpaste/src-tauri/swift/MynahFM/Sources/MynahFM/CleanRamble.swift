import Foundation
import Darwin
import os

#if canImport(FoundationModels)
import FoundationModels
#endif

private let mynahLogger = Logger(subsystem: "com.mynah.app", category: "AppleFM")

@_cdecl("mynah_fm_clean_ramble")
public func mynah_fm_clean_ramble(_ inputPtr: UnsafePointer<CChar>?) -> UnsafeMutablePointer<CChar>? {
    guard let inputPtr = inputPtr else { return nil }
    let inputString = String(cString: inputPtr)
    let startTime = Date()
    mynahLogger.info("[FM] clean_ramble started input_chars=\(inputString.count)")
    
    var resultString = inputString
    
    #if canImport(FoundationModels)
    if #available(macOS 26.0, *) {
        let semaphore = DispatchSemaphore(value: 0)
        
        Task {
            do {
                let session = try LanguageModelSession(
                    model: SystemLanguageModel.default,
                    instructions: {
                        "You are a helpful assistant. Rewrite the following speech transcript to be clean, professional, and readable, removing filler words, stuttering, and repetitions. Keep the core meaning, tone, and details intact. Return only the cleaned text."
                    }
                )
                let response = try await session.respond(to: inputString)
                resultString = response.content
            } catch {
                mynahLogger.error("[FM] clean_ramble failed error=\(error.localizedDescription)")
                print("Error during clean ramble: \(error)")
            }
            semaphore.signal()
        }
        
        let timeout = DispatchTime.now() + 4.0
        if semaphore.wait(timeout: timeout) == .timedOut {
            mynahLogger.error("[FM] clean_ramble timed_out after 4000ms")
            print("Clean ramble timed out after 4.0 seconds")
        }
    }
    #endif
    
    let elapsedMs = Int(Date().timeIntervalSince(startTime) * 1000)
    if resultString == inputString {
        mynahLogger.warning("[FM] clean_ramble produced no change — may have timed out or been skipped elapsed_ms=\(elapsedMs)")
    } else {
        mynahLogger.info("[FM] clean_ramble completed input_chars=\(inputString.count) output_chars=\(resultString.count) elapsed_ms=\(elapsedMs)")
    }
    
    return resultString.withCString { strdup($0) }
}
