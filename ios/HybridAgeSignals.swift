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
      guard let viewController = await MainActor.run(body: { Self.rootViewController() }) else {
        return AgeRangeResult(ageRange: "unknown", source: "unavailable")
      }

      let response = try await AgeRangeService.shared.requestAgeRange(ageGates: 13, 18, in: viewController)

      switch response {
      case .sharing(let range):
        return AgeRangeResult(
          ageRange: Self.toAgeRange(lower: range.lowerBound, upper: range.upperBound),
          source: "apple"
        )
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

  /// Resolves the view controller to present Apple's age sharing sheet from.
  ///
  /// Uses the active window scene rather than `UIApplication.shared.keyWindow`,
  /// which has been deprecated since iOS 13 and is unaware of multi-scene apps.
  @MainActor
  private static func rootViewController() -> UIViewController? {
    let windows = UIApplication.shared.connectedScenes
      .compactMap { $0 as? UIWindowScene }
      .flatMap { $0.windows }

    return (windows.first { $0.isKeyWindow } ?? windows.first)?.rootViewController
  }

  /// Maps a reported age range onto our coarse buckets: child is under 13,
  /// teen is 13 to 17, adult is 18 and over.
  ///
  /// These thresholds are duplicated in
  /// android/src/main/java/com/margelo/nitro/agesignals/HybridAgeSignals.kt.
  /// Change both together.
  ///
  /// The bounds line up with the `ageGates: 13, 18` we request, so a caller in
  /// the youngest bucket reports an upper bound of 12 and a teen reports 17.
  private static func toAgeRange(lower: Int?, upper: Int?) -> String {
    if let upper {
      if upper <= 12 { return "child" }
      if upper <= 17 { return "teen" }
      return "adult"
    }

    if let lower, lower >= 18 { return "adult" }

    return "unknown"
  }
}
