import Foundation

func extractJSONString(from text: String) -> String {
    var cleaned = text.trimmingCharacters(in: .whitespacesAndNewlines)
    
    // Strip markdown code fences if present
    if cleaned.hasPrefix("```json") {
        cleaned = String(cleaned.dropFirst(7))
    } else if cleaned.hasPrefix("```") {
        cleaned = String(cleaned.dropFirst(3))
    }
    
    if cleaned.hasSuffix("```") {
        cleaned = String(cleaned.dropLast(3))
    }
    
    return cleaned.trimmingCharacters(in: .whitespacesAndNewlines)
}
