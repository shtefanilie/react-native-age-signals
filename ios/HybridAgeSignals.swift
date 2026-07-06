import Foundation
import NitroModules
import StoreKit

class HybridAgeSignals: HybridAgeSignalsSpec {
  func isSupported() throws -> Promise<Bool> {
    return Promise.async {
      if #available(iOS 17.4, *) {
        return true
      }
      return false
    }
  }

  func getAgeRange() throws -> Promise<AgeRangeResult> {
    return Promise.async {
      guard #available(iOS 17.4, *) else {
        return AgeRangeResult(ageRange: "unknown", source: "unavailable")
      }

      let range = await DeclaredAgeRange.current

      let ageRange: String
      switch range {
      case .child:
        ageRange = "child"
      case .teen:
        ageRange = "teen"
      case .adult:
        ageRange = "adult"
      default:
        ageRange = "unknown"
      }

      return AgeRangeResult(ageRange: ageRange, source: "apple")
    }
  }
}
