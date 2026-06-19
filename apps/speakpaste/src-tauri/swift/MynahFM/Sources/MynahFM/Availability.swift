import Foundation
import Darwin
import os

#if canImport(FoundationModels)
import FoundationModels
#endif

private let mynahLogger = Logger(subsystem: "com.mynah.app", category: "AppleFM")

@_cdecl("mynah_fm_availability")
public func mynah_fm_availability() -> UnsafeMutablePointer<CChar>? {
    var status = "unsupported"
    mynahLogger.info("[FM] availability_check started")
    
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
    
    mynahLogger.info("[FM] availability_check completed status=\(status)")
    return status.withCString { strdup($0) }
}

@_cdecl("mynah_fm_free")
public func mynah_fm_free(_ ptr: UnsafeMutablePointer<CChar>?) {
    if let ptr = ptr {
        free(ptr)
    }
}
