import Foundation
import Darwin

#if canImport(FoundationModels)
import FoundationModels

@Generable
public struct ListSpec: Codable {
    @Guide(description: "The introduction stem or lead-in text of the list, e.g. 'grocery list:' or 'I need to do:'")
    public let introduction: String
    
    @Guide(description: "The individual bullet points or items of the list")
    public let items: [String]
    
    public init(introduction: String, items: [String]) {
        self.introduction = introduction
        self.items = items
    }
}
#else
public struct ListSpec: Codable {
    public let introduction: String
    public let items: [String]
}
#endif

@_cdecl("mynah_fm_list")
public func mynah_fm_list(_ inputPtr: UnsafePointer<CChar>?) -> UnsafeMutablePointer<CChar>? {
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
                        "You are a helpful assistant. Parse the input speech transcript and structure it into a list, identifying the introduction statement and the list items."
                    }
                )
                let response = try await session.respond(to: inputString, generating: ListSpec.self)
                let encoder = JSONEncoder()
                let data = try encoder.encode(response.content)
                if let jsonStr = String(data: data, encoding: .utf8) {
                    jsonResult = jsonStr
                }
            } catch {
                print("Error during list shaping: \(error)")
            }
            semaphore.signal()
        }
        
        let timeout = DispatchTime.now() + 4.0
        if semaphore.wait(timeout: timeout) == .timedOut {
            print("List shaping timed out after 4.0 seconds")
        }
    }
    #endif
    
    if let result = jsonResult {
        return result.withCString { strdup($0) }
    } else {
        return nil
    }
}
