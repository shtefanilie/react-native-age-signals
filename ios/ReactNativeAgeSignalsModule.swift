import ExpoModulesCore
import StoreKit

public class ReactNativeAgeSignalsModule: Module {
  public func definition() -> ModuleDefinition {
    Name("ReactNativeAgeSignals")

    AsyncFunction("isSupported") { () -> Bool in
      if #available(iOS 17.4, *) {
        return true
      }
      return false
    }

    AsyncFunction("getAgeRange") { () -> [String: String] in
      guard #available(iOS 17.4, *) else {
        return ["ageRange": "unknown", "source": "unavailable"]
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

      return ["ageRange": ageRange, "source": "apple"]
    }
  }
}
