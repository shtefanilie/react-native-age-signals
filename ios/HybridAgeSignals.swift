import Foundation
import NitroModules
#if canImport(DeclaredAgeRange)
import DeclaredAgeRange
#endif
import UIKit

class HybridAgeSignals: HybridAgeSignalsSpec {
  func isSupported() throws -> Promise<Bool> {
    return Promise.async {
      #if canImport(DeclaredAgeRange)
      if #available(iOS 26.0, *) {
        return true
      }
      #endif
      return false
    }
  }

  func getAgeRange() throws -> Promise<AgeRangeResult> {
    return Promise.async {
      #if canImport(DeclaredAgeRange)
      if #available(iOS 26.0, *) {
        return await self.fetchAgeRange()
      }
      #endif
      return AgeRangeResult(ageRange: "unknown", source: "unavailable")
    }
  }

  #if canImport(DeclaredAgeRange)
  @available(iOS 26.0, *)
  private func fetchAgeRange() async -> AgeRangeResult {
    do {
      guard let viewController = await MainActor.run(body: { UIApplication.shared.keyWindow?.rootViewController }) else {
        return AgeRangeResult(ageRange: "unknown", source: "unavailable")
      }

      let response = try await AgeRangeService.shared.requestAgeRange(ageGates: 13, 18, in: viewController)

      switch response {
      case .sharing(let range):
        let ageRange: String
        if let lower = range.lowerBound, let upper = range.upperBound {
          if upper <= 13 {
            ageRange = "child"
          } else if upper <= 18 {
            ageRange = "teen"
          } else {
            ageRange = "adult"
          }
        } else if let lower = range.lowerBound {
          ageRange = lower >= 18 ? "adult" : "unknown"
        } else {
          ageRange = "unknown"
        }
        return AgeRangeResult(ageRange: ageRange, source: "apple")
      case .declinedSharing:
        return AgeRangeResult(ageRange: "unknown", source: "declined")
      @unknown default:
        return AgeRangeResult(ageRange: "unknown", source: "unavailable")
      }
    } catch {
      return AgeRangeResult(ageRange: "unknown", source: "error")
    }
  }
  #endif
}
