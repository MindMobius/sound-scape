import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:soundscape_client/app/soundscape_app.dart';
import 'package:soundscape_client/ui/player/player_control_rail.dart';

import 'support/soundscape_test_harness.dart';

void main() {
  testWidgets('home keeps one global player and expands that same surface', (
    tester,
  ) async {
    final controller = FakeSoundscapeController();
    addTearDown(controller.close);
    await tester.pumpWidget(SoundscapeApp(audioController: controller));

    expect(find.text('想听见哪里？'), findsOneWidget);
    expect(find.byType(PlayerControlRail), findsOneWidget);

    await tester.tap(find.byKey(const ValueKey('player-information')));
    await tester.pump();
    await pumpSoundscapeMotion(tester);

    expect(find.byType(PlayerControlRail), findsOneWidget);
    expect(find.text('舒缓'), findsOneWidget);
    expect(find.text('均衡'), findsOneWidget);
    expect(find.text('丰沛'), findsOneWidget);
    expect(find.byType(LinearProgressIndicator), findsNothing);
  });

  testWidgets('expanded player scrolls instead of overflowing in landscape', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(2400, 1080);
    tester.view.devicePixelRatio = 3;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    final controller = FakeSoundscapeController();
    addTearDown(controller.close);
    await tester.pumpWidget(SoundscapeApp(audioController: controller));
    await tester.tap(find.byKey(const ValueKey('player-information')));
    await tester.pump();
    await pumpSoundscapeMotion(tester);

    expect(tester.takeException(), isNull);
    expect(find.byType(PlayerControlRail), findsOneWidget);
    expect(find.text('轻'), findsOneWidget);
    expect(find.text('繁'), findsOneWidget);
  });

  testWidgets(
    'immersive mode keeps the same player and system back restores it',
    (tester) async {
      final controller = FakeSoundscapeController();
      addTearDown(controller.close);
      await tester.pumpWidget(SoundscapeApp(audioController: controller));

      await tester.tap(find.byKey(const ValueKey('player-information')));
      await tester.pump();
      await pumpSoundscapeMotion(tester);
      await tester.tap(find.bySemanticsLabel('进入沉浸聆听'));
      await tester.pump();
      await pumpSoundscapeMotion(tester, frames: 6);

      expect(find.byType(PlayerControlRail), findsOneWidget);
      expect(find.byKey(const ValueKey('leave-immersive')), findsOneWidget);

      await tester.binding.handlePopRoute();
      await tester.pump();
      await pumpSoundscapeMotion(tester, frames: 6);

      expect(find.byType(PlayerControlRail), findsOneWidget);
      expect(find.byKey(const ValueKey('collapse-player')), findsOneWidget);
      expect(find.text('舒缓'), findsOneWidget);
    },
  );

  testWidgets(
    'choosing a scene updates the global player and starts playback',
    (tester) async {
      final controller = FakeSoundscapeController();
      addTearDown(controller.close);
      await tester.pumpWidget(SoundscapeApp(audioController: controller));

      await tester.drag(
        find.byType(CustomScrollView).first,
        const Offset(0, -980),
      );
      await tester.pump();
      await tester.tap(find.text('深夜海岸'));
      await tester.pump();

      expect(controller.snapshot.scene.id, 'coastal-night');
      expect(controller.snapshot.isPlaying, isTrue);
      expect(
        find.descendant(
          of: find.byType(PlayerControlRail),
          matching: find.text('深夜海岸'),
        ),
        findsOneWidget,
      );
    },
  );
}
