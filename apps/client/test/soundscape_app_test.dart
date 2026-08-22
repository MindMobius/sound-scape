import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:soundscape_client/app/soundscape_app.dart';
import 'package:soundscape_client/domain/soundscape_scene.dart';
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

  testWidgets('favorite is available from the quiet home scene row', (
    tester,
  ) async {
    final controller = FakeSoundscapeController();
    addTearDown(controller.close);
    await tester.pumpWidget(SoundscapeApp(audioController: controller));

    final favorite = find.byKey(const ValueKey('home-favorite-rain-cabin'));
    await tester.ensureVisible(favorite);
    await tester.pump(const Duration(milliseconds: 120));
    await tester.tap(favorite);
    await tester.pump();

    expect(controller.snapshot.favoriteSceneIds, contains('rain-cabin'));
    expect(find.byTooltip('取消收藏'), findsWidgets);
  });

  testWidgets('library assets become real layers with selectable character', (
    tester,
  ) async {
    await _useLargeTestViewport(tester);
    final controller = FakeSoundscapeController();
    addTearDown(controller.close);
    await tester.pumpWidget(SoundscapeApp(audioController: controller));
    await _openPlayerDetails(tester);

    final add = find.byKey(const ValueKey('asset-add-test.wind'));
    await tester.ensureVisible(add);
    await tester.pump(const Duration(milliseconds: 120));
    await tester.tap(add);
    await tester.pump();

    expect(controller.snapshot.addedSoundAssetIds, contains('test.wind'));
    final character = find.byKey(
      const ValueKey('layer-character-library:test.wind'),
    );
    await tester.ensureVisible(character);
    await tester.pump(const Duration(milliseconds: 120));
    await tester.tap(character);
    await tester.pump();
    await tester.tap(find.text('老式收音机').last);
    await tester.pump();

    expect(
      controller.snapshot.layers
          .firstWhere((layer) => layer.definition.id == 'library:test.wind')
          .character,
      SoundCharacter.radio,
    );

    final remove = find.byKey(const ValueKey('remove-layer-library:test.wind'));
    await tester.ensureVisible(remove);
    await tester.tap(remove);
    await tester.pump();

    expect(
      controller.snapshot.addedSoundAssetIds,
      isNot(contains('test.wind')),
    );
  });

  testWidgets('imported sounds and saved moments complete the local workflow', (
    tester,
  ) async {
    await _useLargeTestViewport(tester);
    final controller = FakeSoundscapeController();
    addTearDown(controller.close);
    await tester.pumpWidget(SoundscapeApp(audioController: controller));
    await _openPlayerDetails(tester);

    await tester.tap(
      find.byKey(const ValueKey('library-tab-mine')),
      warnIfMissed: false,
    );
    await tester.pump(const Duration(milliseconds: 160));
    final import = find.byKey(const ValueKey('import-sound'));
    await tester.ensureVisible(import);
    await tester.tap(import);
    await tester.pump();

    expect(controller.snapshot.importedSounds, hasLength(1));
    expect(
      controller.snapshot.addedSoundAssetIds,
      contains('user.test-import'),
    );

    final save = find.byKey(const ValueKey('save-moment'));
    await tester.ensureVisible(save);
    await tester.tap(save);
    await tester.pump();
    await tester.enterText(find.byType(TextField), '窗边的一刻');
    await tester.tap(find.text('存下').last);
    await tester.pump();

    expect(controller.snapshot.savedPresets.single.name, '窗边的一刻');
    expect(
      controller.snapshot.savedPresets.single.mix.addedAssetIds,
      contains('user.test-import'),
    );
  });
}

Future<void> _useLargeTestViewport(WidgetTester tester) async {
  tester.view.physicalSize = const Size(1000, 900);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);
}

Future<void> _openPlayerDetails(WidgetTester tester) async {
  await tester.tap(find.byKey(const ValueKey('player-information')));
  await tester.pump();
  await pumpSoundscapeMotion(tester);
  final playerScroll = find.byType(CustomScrollView).last;
  await tester.drag(playerScroll, const Offset(0, -760));
  await tester.pump(const Duration(milliseconds: 180));
  await tester.drag(playerScroll, const Offset(0, -620));
  await tester.pump(const Duration(milliseconds: 180));
}
