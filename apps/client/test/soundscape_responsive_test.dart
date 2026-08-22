import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:soundscape_client/app/soundscape_app.dart';
import 'package:soundscape_client/ui/player/player_control_rail.dart';

import 'support/soundscape_test_harness.dart';

void main() {
  const viewports = [
    _TestViewport('small phone', Size(360, 640)),
    _TestViewport('phone with large text', Size(390, 844), textScale: 1.3),
    _TestViewport('phone landscape', Size(844, 390)),
    _TestViewport('tablet dark', Size(834, 1112), dark: true),
    _TestViewport('desktop', Size(1440, 900)),
  ];

  for (final viewport in viewports) {
    testWidgets('player stays coherent on ${viewport.name}', (tester) async {
      tester.view.physicalSize = viewport.size;
      tester.view.devicePixelRatio = 1;
      tester.platformDispatcher.textScaleFactorTestValue = viewport.textScale;
      tester.platformDispatcher.platformBrightnessTestValue = viewport.dark
          ? Brightness.dark
          : Brightness.light;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      addTearDown(tester.platformDispatcher.clearTextScaleFactorTestValue);
      addTearDown(tester.platformDispatcher.clearPlatformBrightnessTestValue);

      final controller = FakeSoundscapeController();
      addTearDown(controller.close);
      await tester.pumpWidget(SoundscapeApp(audioController: controller));
      await tester.pump();

      expect(find.byType(PlayerControlRail), findsOneWidget);
      expect(tester.takeException(), isNull);

      await tester.tap(find.byKey(const ValueKey('player-information')));
      await tester.pump();
      await pumpSoundscapeMotion(tester);

      expect(find.byType(PlayerControlRail), findsOneWidget);
      expect(find.byType(LinearProgressIndicator), findsNothing);
      expect(find.byKey(const ValueKey('collapse-player')), findsOneWidget);
      expect(tester.takeException(), isNull);

      final playerScroll = find.byType(CustomScrollView).last;
      await tester.drag(playerScroll, const Offset(0, -760));
      await tester.pump(const Duration(milliseconds: 180));
      await tester.drag(playerScroll, const Offset(0, -920));
      await tester.pump(const Duration(milliseconds: 180));

      expect(find.text('添加声音'), findsOneWidget);
      expect(tester.takeException(), isNull);

      await tester.tap(find.byKey(const ValueKey('collapse-player')));
      await pumpSoundscapeMotion(tester);

      expect(find.byType(PlayerControlRail), findsOneWidget);
      expect(tester.takeException(), isNull);
    });
  }
}

class _TestViewport {
  const _TestViewport(
    this.name,
    this.size, {
    this.textScale = 1,
    this.dark = false,
  });

  final String name;
  final Size size;
  final double textScale;
  final bool dark;
}
