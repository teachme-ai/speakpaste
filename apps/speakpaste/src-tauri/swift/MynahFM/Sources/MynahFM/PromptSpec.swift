import Foundation
import Darwin
import os

#if canImport(FoundationModels)
import FoundationModels
#endif

private let mynahLogger = Logger(subsystem: "com.mynah.app", category: "AppleFM")

public struct PromptSpec: Codable {
    public let task: String
    public let context: String
    public let constraints: [String]
    public let outputFormat: String
    
    public init(task: String, context: String, constraints: [String], outputFormat: String) {
        self.task = task
        self.context = context
        self.constraints = constraints
        self.outputFormat = outputFormat
    }
}

func parsePromptFallback(input: String, modelResponse: String) -> PromptSpec {
    // If JSON parsing fails, we treat the entire input as the task, and others as empty.
    return PromptSpec(
        task: input,
        context: "",
        constraints: [],
        outputFormat: ""
    )
}

@_cdecl("mynah_fm_prompt")
public func mynah_fm_prompt(_ inputPtr: UnsafePointer<CChar>?) -> UnsafeMutablePointer<CChar>? {
    guard let inputPtr = inputPtr else { return nil }
    let inputString = String(cString: inputPtr)
    let startTime = Date()
    mynahLogger.info("[FM] prompt_generation started input_chars=\(inputString.count)")
    
    var jsonResult: String? = nil
    
    #if canImport(FoundationModels)
    if #available(macOS 26.0, *) {
        let semaphore = DispatchSemaphore(value: 0)
        
        Task {
            do {
                let session = try LanguageModelSession(
                    model: SystemLanguageModel.default,
                    instructions: {
                        """
                        You are a helpful assistant. Parse the input speech transcript and structure it into a prompt specification JSON object matching this schema:
                        {
                          "task": "The main task or instruction the prompt should execute",
                          "context": "The context or background information for the task",
                          "constraints": ["Specific constraint 1", "Specific constraint 2"],
                          "outputFormat": "The expected output format of the response"
                        }
                        Return ONLY the raw JSON object. Do not include any conversational text, explanations, or markdown formatting outside of the JSON.
                        """
                    }
                )
                let response = try await session.respond(to: inputString)
                let textResponse = response.content
                
                let cleanedJSON = extractJSONString(from: textResponse)
                if let data = cleanedJSON.data(using: .utf8) {
                    let decoder = JSONDecoder()
                    if let parsed = try? decoder.decode(PromptSpec.self, from: data) {
                        let encoder = JSONEncoder()
                        let encodedData = try encoder.encode(parsed)
                        jsonResult = String(data: encodedData, encoding: .utf8)
                    }
                }
                
                if jsonResult == nil {
                    let fallback = parsePromptFallback(input: inputString, modelResponse: textResponse)
                    let encoder = JSONEncoder()
                    if let encodedData = try? encoder.encode(fallback) {
                        jsonResult = String(data: encodedData, encoding: .utf8)
                    }
                }
            } catch {
                mynahLogger.error("[FM] prompt_generation failed error=\(error.localizedDescription)")
                print("Error during prompt generation: \(error)")
            }
            semaphore.signal()
        }
        
        let timeout = DispatchTime.now() + 4.0
        if semaphore.wait(timeout: timeout) == .timedOut {
            mynahLogger.error("[FM] prompt_generation timed_out after 4000ms")
            print("Prompt generation timed out after 4.0 seconds")
        }
    }
    #endif
    
    if jsonResult == nil {
        // Local fallback (no on-device model support)
        let fallback = parsePromptFallback(input: inputString, modelResponse: "")
        let encoder = JSONEncoder()
        if let encodedData = try? encoder.encode(fallback) {
            jsonResult = String(data: encodedData, encoding: .utf8)
        }
    }
    
    let elapsedMs = Int(Date().timeIntervalSince(startTime) * 1000)
    if let result = jsonResult {
        mynahLogger.info("[FM] prompt_generation completed input_chars=\(inputString.count) json_chars=\(result.count) elapsed_ms=\(elapsedMs)")
        return result.withCString { strdup($0) }
    } else {
        mynahLogger.warning("[FM] prompt_generation produced no result elapsed_ms=\(elapsedMs)")
        return nil
    }
}
