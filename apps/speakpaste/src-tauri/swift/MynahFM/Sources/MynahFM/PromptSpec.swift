import Foundation
import Darwin

#if canImport(FoundationModels)
import FoundationModels

@Generable
public struct PromptSpec: Codable {
    @Guide(description: "The main task or instruction the prompt should execute")
    public let task: String
    
    @Guide(description: "The context or background information for the task")
    public let context: String
    
    @Guide(description: "Specific constraints or rules the output must follow")
    public let constraints: [String]
    
    @Guide(description: "The expected output format of the response")
    public let outputFormat: String
    
    public init(task: String, context: String, constraints: [String], outputFormat: String) {
        self.task = task
        self.context = context
        self.constraints = constraints
        self.outputFormat = outputFormat
    }
}
#else
public struct PromptSpec: Codable {
    public let task: String
    public let context: String
    public let constraints: [String]
    public let outputFormat: String
}
#endif

@_cdecl("mynah_fm_prompt")
public func mynah_fm_prompt(_ inputPtr: UnsafePointer<CChar>?) -> UnsafeMutablePointer<CChar>? {
    guard let inputPtr = inputPtr else { return nil }
    let inputString = String(cString: inputPtr)
    
    var jsonResult: String? = nil
    
    #if canImport(FoundationModels)
    if #available(macOS 26.0, *) {
        let semaphore = DispatchSemaphore(value: 0)
        
        Task {
            do {
                let session = try LanguageModelSession(
                    model: SystemLanguageModel.default,
                    instructions: {
                        "You are a helpful assistant. Parse the input speech transcript and structure it into a prompt specification, identifying the task, context, constraints, and output format."
                    }
                )
                let response = try await session.respond(to: inputString, generating: PromptSpec.self)
                let encoder = JSONEncoder()
                let data = try encoder.encode(response.content)
                if let jsonStr = String(data: data, encoding: .utf8) {
                    jsonResult = jsonStr
                }
            } catch {
                print("Error during prompt generation: \(error)")
            }
            semaphore.signal()
        }
        
        let timeout = DispatchTime.now() + 4.0
        if semaphore.wait(timeout: timeout) == .timedOut {
            print("Prompt generation timed out after 4.0 seconds")
        }
    }
    #endif
    
    if let result = jsonResult {
        return result.withCString { strdup($0) }
    } else {
        return nil
    }
}
