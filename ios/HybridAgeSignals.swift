import Foundation
import NitroModules
#if canImport(DeclaredAgeRange)
import DeclaredAgeRange
#endif
import UIKit
import os

class HybridAgeSignals: HybridAgeSignalsSpec {
  /// Logs to the unified log under the "react-native-age-signals" subsystem, so
  /// a failure can be read with
  /// `log stream --predicate 'subsystem == "react-native-age-signals"'`.
  ///
  /// The result type deliberately carries no error detail — `source` says only
  /// whether the outcome is worth retrying — so this log is the only place the
  /// underlying reason is recoverable.
  private static let logger = Logger(subsystem: "react-native-age-signals", category: "AgeSignals")

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
        Self.logger.warning(
          "Found no root view controller to present the age range sheet from. Reporting unavailable."
        )
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
        Self.logger.warning("AgeRangeService returned an unrecognised response. Reporting unavailable.")
        return AgeRangeResult(ageRange: "unknown", source: "unavailable")
      }
    } catch let error as AgeRangeService.Error {
      return Self.result(for: error)
    } catch {
      // Cancellation and anything Apple adds later land here. Nothing proves the
      // failure is permanent, so report it as retryable.
      Self.logger.error(
        "requestAgeRange failed with an unrecognised error: \(String(describing: error), privacy: .public). Reporting a retryable error."
      )
      return AgeRangeResult(ageRange: "unknown", source: "error")
    }
  }

  /// Maps an `AgeRangeService.Error` onto `source`, which is what tells a caller
  /// whether retrying is worthwhile.
  ///
  /// The distinction matters because a consumer typically caches the outcome, and
  /// caching a transient failure makes it permanent. `unavailable` means "do not
  /// ask this device again"; `error` means "ask again next launch".
  ///
  /// The same rule is applied to Play's error codes in
  /// android/src/main/java/com/margelo/nitro/agesignals/HybridAgeSignals.kt.
  /// Change both together.
  @available(iOS 26.0, *)
  private static func result(for error: AgeRangeService.Error) -> AgeRangeResult {
    switch error {
    case .notAvailable:
      // The device or the signed-in Apple Account cannot supply a declared age
      // range. Nothing the app does will change that within this install.
      logger.warning("AgeRangeService reported notAvailable. Reporting unavailable.")
      return AgeRangeResult(ageRange: "unknown", source: "unavailable")
    case .invalidRequest:
      // Our own call was malformed, e.g. the age gates we passed. Retrying will
      // not fix it, but reporting it as unavailable would let a caller cache the
      // bug out of sight, so keep it loud and retryable.
      logger.error(
        "AgeRangeService rejected the request as invalid. This is a bug in the age gates this module requests."
      )
      return AgeRangeResult(ageRange: "unknown", source: "error")
    @unknown default:
      logger.error(
        "AgeRangeService reported an error case added after this module was written: \(String(describing: error), privacy: .public). Reporting a retryable error."
      )
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
