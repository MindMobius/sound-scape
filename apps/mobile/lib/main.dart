import 'package:audio_service/audio_service.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';

import 'app/soundscape_app.dart';
import 'audio/soundscape_audio_handler.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  late final SoundscapeAudioHandler audioHandler;
  final isMobilePlatform =
      !kIsWeb &&
      (defaultTargetPlatform == TargetPlatform.android ||
          defaultTargetPlatform == TargetPlatform.iOS);
  if (isMobilePlatform) {
    audioHandler = await AudioService.init<SoundscapeAudioHandler>(
      builder: SoundscapeAudioHandler.new,
      config: const AudioServiceConfig(
        androidNotificationChannelId: 'cn.shengjing.soundscape.playback',
        androidNotificationChannelName: '声景播放',
        androidNotificationOngoing: true,
        androidStopForegroundOnPause: true,
      ),
    );
  } else {
    audioHandler = SoundscapeAudioHandler();
  }

  runApp(SoundscapeApp(audioController: audioHandler));
}
