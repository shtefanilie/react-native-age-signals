Pod::Spec.new do |s|
  s.name           = 'ReactNativeAgeSignals'
  s.version        = '0.1.0'
  s.summary        = 'Apple Declared Age Range and Google Play Age Signals for React Native'
  s.description    = 'Expo module wrapping Apple DeclaredAgeRange (StoreKit, iOS 17.4+) and Google Play Age Signals to query the app store\'s knowledge of the current user\'s age bracket.'
  s.author         = { 'Stefan Ilie' => 'stefanionut92@gmail.com' }
  s.homepage       = 'https://github.com/shtefanilie/react-native-age-signals'
  s.platforms      = {
    :ios => '16.4'
  }
  s.source         = { git: 'https://github.com/shtefanilie/react-native-age-signals.git', tag: s.version.to_s }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  # Swift/Objective-C compatibility
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
  }

  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
end
