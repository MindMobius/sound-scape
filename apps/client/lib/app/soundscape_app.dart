import 'package:flutter/material.dart';

import '../audio/soundscape_controller.dart';
import '../ui/home/soundscape_home_screen.dart';
import '../ui/theme/soundscape_theme.dart';

class SoundscapeApp extends StatelessWidget {
  const SoundscapeApp({required this.audioController, super.key});

  final SoundscapeController audioController;

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: '声景',
      debugShowCheckedModeBanner: false,
      theme: SoundscapeTheme.light,
      darkTheme: SoundscapeTheme.dark,
      themeMode: ThemeMode.system,
      home: SoundscapeHomeScreen(audioController: audioController),
    );
  }
}
