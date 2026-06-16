import Foundation
import Darwin

#if canImport(FoundationModels)
import FoundationModels
#endif

public struct ListSpec: Codable {
    public let introduction: String
    public let items: [String]
    
    public init(introduction: String, items: [String]) {
        self.introduction = introduction
        self.items = items
    }
}

func parseListFallback(input: String, modelResponse: String) -> ListSpec {
    let textToParse = modelResponse.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? input : modelResponse
    let lines = textToParse.components(separatedBy: .newlines)
        .map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }
        .filter { !$0.isEmpty }
    
    var intro = ""
    var items: [String] = []
    
    for line in lines {
        let isBullet = line.hasPrefix("-") || line.hasPrefix("*") || line.hasPrefix("•") || 
                       (line.first?.isNumber == true && line.contains("."))
        
        if isBullet {
            var cleanedItem = line
            if line.hasPrefix("-") || line.hasPrefix("*") || line.hasPrefix("•") {
                cleanedItem = String(line.dropFirst()).trimmingCharacters(in: .whitespacesAndNewlines)
            } else {
                if let dotIndex = line.firstIndex(of: ".") {
                    let afterDot = line.suffix(from: line.index(after: dotIndex))
                    cleanedItem = afterDot.trimmingCharacters(in: .whitespacesAndNewlines)
                }
            }
            items.append(cleanedItem)
        } else {
            if intro.isEmpty {
                intro = line
            } else if items.isEmpty {
                intro += " " + line
            } else {
                items.append(line)
            }
        }
    }
    
    if intro.isEmpty {
        intro = "List:"
    }
    return ListSpec(introduction: intro, items: items)
}

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
                        """
                        You are a helpful assistant. Parse the input speech transcript and structure it into a JSON object matching this schema:
                        {
                          "introduction": "The introduction stem or lead-in text of the list, e.g. 'grocery list:' or 'I need to do:'",
                          "items": ["item 1", "item 2"]
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
                    if let parsed = try? decoder.decode(ListSpec.self, from: data) {
                        let encoder = JSONEncoder()
                        let encodedData = try encoder.encode(parsed)
                        jsonResult = String(data: encodedData, encoding: .utf8)
                    }
                }
                
                if jsonResult == nil {
                    let fallback = parseListFallback(input: inputString, modelResponse: textResponse)
                    let encoder = JSONEncoder()
                    if let encodedData = try? encoder.encode(fallback) {
                        jsonResult = String(data: encodedData, encoding: .utf8)
                    }
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
    
    if jsonResult == nil {
        // Local fallback (no on-device model support)
        let fallback = parseListFallback(input: inputString, modelResponse: "")
        let encoder = JSONEncoder()
        if let encodedData = try? encoder.encode(fallback) {
            jsonResult = String(data: encodedData, encoding: .utf8)
        }
    }
    
    if let result = jsonResult {
        return result.withCString { strdup($0) }
    } else {
        return nil
    }
}
