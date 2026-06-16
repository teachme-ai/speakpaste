import Foundation
import Darwin

#if canImport(FoundationModels)
import FoundationModels
#endif

@_cdecl("mynah_fm_availability")
public func mynah_fm_availability() -> UnsafeMutablePointer<CChar>? {
    var status = "unsupported"
    
    #if canImport(FoundationModels)
    if #available(macOS 26.0, *) {
        let model = SystemLanguageModel.default
        switch model.availability {
        case .available:
            status = "available"
        case .unavailable(let reason):
            switch reason {
            case .deviceNotEligible:
                status = "deviceNotEligible"
            case .appleIntelligenceNotEnabled:
                status = "appleIntelligenceNotEnabled"
            case .modelNotReady:
                status = "modelNotReady"
            @unknown default:
                status = "unknown"
            }
        }
    }
    #endif
    
    return status.withCString { strdup($0) }
}

@_cdecl("mynah_fm_free")
public func mynah_fm_free(_ ptr: UnsafeMutablePointer<CChar>?) {
    if let ptr = ptr {
        free(ptr)
    }
}
