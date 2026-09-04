Pod::Spec.new do |s|
  s.name           = 'ReactNativeAgeSignals'
  s.version        = '0.5.0'
  s.summary        = 'Apple Declared Age Range and Google Play Age Signals for React Native'
  s.description    = 'Nitro module wrapping Apple DeclaredAgeRange (StoreKit, iOS 26.0+) and Google Play Age Signals to query the app store\'s knowledge of the current user\'s age bracket.'
  s.author         = { 'Stefan Ilie' => 'stefanionut92@gmail.com' }
  s.homepage       = 'https://github.com/shtefanilie/react-native-age-signals'
  s.platforms      = {
    :ios => '15.1'
  }
  s.source         = { git: 'https://github.com/shtefanilie/react-native-age-signals.git', tag: s.version.to_s }
  s.static_framework = true

  s.dependency 'NitroModules'

  s.weak_framework = 'DeclaredAgeRange'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_VERSION' => '5.9',
  }

  s.source_files = "ios/**/*.{h,m,mm,swift,hpp,cpp}"

  load File.join(__dir__, 'nitrogen/generated/ios/ReactNativeAgeSignals+autolinking.rb')
  add_nitrogen_files(s)
end
