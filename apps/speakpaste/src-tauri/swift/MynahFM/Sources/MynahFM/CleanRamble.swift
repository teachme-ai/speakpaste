import Foundation
import Darwin

#if canImport(FoundationModels)
import FoundationModels
#endif

@_cdecl("mynah_fm_clean_ramble")
public func mynah_fm_clean_ramble(_ inputPtr: UnsafePointer<CChar>?) -> UnsafeMutablePointer<CChar>? {
    guard let inputPtr = inputPtr else { return nil }
    let inputString = String(cString: inputPtr)
    
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
                print("Error during clean ramble: \(error)")
            }
            semaphore.signal()
        }
        
        let timeout = DispatchTime.now() + 4.0
        if semaphore.wait(timeout: timeout) == .timedOut {
            print("Clean ramble timed out after 4.0 seconds")
        }
    }
    #endif
    
    return resultString.withCString { strdup($0) }
}
