import 'dart:io';
import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:soundscape_client/app/soundscape_app.dart';
import 'package:soundscape_client/audio/soundscape_audio_handler.dart';
import 'package:soundscape_client/audio/soundscape_runtime.dart';
import 'package:soundscape_client/data/soundscape_state_store.dart';
import 'package:soundscape_client/domain/soundscape_scene.dart';
import 'package:soundscape_client/domain/soundscape_user_state.dart';
import 'package:soundscape_client/ui/player/player_control_rail.dart';

void main() {
  final binding = IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('native runtime survives player expansion and playback', (
    tester,
  ) async {
    final semantics = tester.ensureSemantics();
    final stateStore = MemorySoundscapeStateStore();
    const visualBoundaryKey = ValueKey('visual-review-boundary');
    final controller = SoundscapeAudioHandler(
      runtime: SoundscapeRuntime(stateStore: stateStore),
    );
    SoundscapeUserState? persistedState;
    try {
      await controller.ready;
      await tester.pumpWidget(
        RepaintBoundary(
          key: visualBoundaryKey,
          child: SoundscapeApp(audioController: controller),
        ),
      );
      await tester.pump();
      await _captureVisual(tester, visualBoundaryKey, 'windows-home');
      await _captureVisualAtSize(
        tester,
        binding,
        visualBoundaryKey,
        const Size(390, 844),
        'mobile-home',
      );

      await tester.tap(find.byKey(const ValueKey('player-information')));
      await _pumpMotion(tester);

      expect(find.byType(PlayerControlRail), findsOneWidget);
      expect(find.byKey(const ValueKey('collapse-player')), findsOneWidget);
      expect(tester.takeException(), isNull);
      await _captureVisual(tester, visualBoundaryKey, 'windows-player');
      await _captureVisualAtSize(
        tester,
        binding,
        visualBoundaryKey,
        const Size(390, 844),
        'mobile-player',
      );

      await controller.play();
      await tester.pump(const Duration(milliseconds: 800));

      expect(controller.snapshot.isPlaying, isTrue);
      expect(find.byType(PlayerControlRail), findsOneWidget);
      expect(tester.takeException(), isNull);

      controller.setMasterVolume(0.41);
      controller.setSceneFavorite('rain-cabin', favorite: true);
      await controller.addSoundAsset('ambie.wind.v1');
      controller.setLayerCharacter(
        'library:ambie.wind.v1',
        SoundCharacter.radio,
      );
      controller.saveCurrentAsPreset(id: 'integration', name: '原生验收');
      await controller.removeSoundLayer('library:ambie.wind.v1');
      await controller.applySavedPreset('integration');

      expect(controller.snapshot.addedSoundAssetIds, contains('ambie.wind.v1'));
      expect(
        controller.snapshot.layers
            .firstWhere(
              (layer) => layer.definition.id == 'library:ambie.wind.v1',
            )
            .character,
        SoundCharacter.radio,
      );

      final playerScroll = find.byType(CustomScrollView).last;
      await tester.drag(playerScroll, const Offset(0, -760));
      await tester.pump(const Duration(milliseconds: 180));
      await tester.drag(playerScroll, const Offset(0, -820));
      await tester.pump(const Duration(milliseconds: 180));
      expect(find.text('添加声音'), findsOneWidget);
      await _captureVisual(tester, visualBoundaryKey, 'windows-sound-library');
      await _captureVisualAtSize(
        tester,
        binding,
        visualBoundaryKey,
        const Size(390, 844),
        'mobile-sound-library',
      );
    } finally {
      semantics.dispose();
      await controller.shutdown();
      persistedState = await stateStore.load();
    }

    expect(persistedState?.masterVolume, 0.41);
    expect(persistedState?.favoriteSceneIds, contains('rain-cabin'));
    expect(persistedState?.savedPresets.single.name, '原生验收');
    expect(
      persistedState?.savedPresets.single.mix.addedAssetIds,
      contains('ambie.wind.v1'),
    );
  });
}

Future<void> _pumpMotion(WidgetTester tester) async {
  for (var frame = 0; frame < 8; frame++) {
    await tester.pump(const Duration(milliseconds: 90));
  }
}

Future<void> _captureVisual(
  WidgetTester tester,
  Key boundaryKey,
  String name,
) async {
  final outputPath = Platform.environment['SOUNDSCAPE_VISUAL_OUTPUT'];
  if (outputPath == null || outputPath.isEmpty) return;
  final directory = Directory(outputPath);
  await directory.create(recursive: true);
  final boundary = tester.renderObject<RenderRepaintBoundary>(
    find.byKey(boundaryKey),
  );
  final image = await boundary.toImage();
  final byteData = await image.toByteData(format: ui.ImageByteFormat.png);
  if (byteData == null) throw StateError('Could not encode $name.');
  await File('${directory.path}${Platform.pathSeparator}$name.png')
      .writeAsBytes(byteData.buffer.asUint8List(), flush: true);
}

Future<void> _captureVisualAtSize(
  WidgetTester tester,
  IntegrationTestWidgetsFlutterBinding binding,
  Key boundaryKey,
  Size size,
  String name,
) async {
  final outputPath = Platform.environment['SOUNDSCAPE_VISUAL_OUTPUT'];
  if (outputPath == null || outputPath.isEmpty) return;
  await binding.setSurfaceSize(size);
  try {
    await tester.pump(const Duration(milliseconds: 180));
    await _captureVisual(tester, boundaryKey, name);
  } finally {
    await binding.setSurfaceSize(null);
    await tester.pump(const Duration(milliseconds: 180));
  }
}
