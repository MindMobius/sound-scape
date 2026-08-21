import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:soundscape_mobile/app/soundscape_app.dart';
import 'package:soundscape_mobile/audio/soundscape_audio_handler.dart';
import 'package:soundscape_mobile/audio/soundscape_runtime.dart';
import 'package:soundscape_mobile/data/soundscape_state_store.dart';
import 'package:soundscape_mobile/domain/soundscape_user_state.dart';
import 'package:soundscape_mobile/ui/player/player_control_rail.dart';

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('native runtime survives player expansion and playback', (
    tester,
  ) async {
    final semantics = tester.ensureSemantics();
    final stateStore = MemorySoundscapeStateStore();
    final controller = SoundscapeAudioHandler(
      runtime: SoundscapeRuntime(stateStore: stateStore),
    );
    SoundscapeUserState? persistedState;
    try {
      await controller.ready;
      await tester.pumpWidget(SoundscapeApp(audioController: controller));
      await tester.pump();

      await tester.tap(find.byKey(const ValueKey('player-information')));
      await _pumpMotion(tester);

      expect(find.byType(PlayerControlRail), findsOneWidget);
      expect(find.byKey(const ValueKey('collapse-player')), findsOneWidget);
      expect(tester.takeException(), isNull);

      await controller.play();
      await tester.pump(const Duration(milliseconds: 800));

      expect(controller.snapshot.isPlaying, isTrue);
      expect(find.byType(PlayerControlRail), findsOneWidget);
      expect(tester.takeException(), isNull);

      controller.setMasterVolume(0.41);
      controller.setSceneFavorite('rain-cabin', favorite: true);
      controller.saveCurrentAsPreset(id: 'integration', name: '原生验收');
    } finally {
      semantics.dispose();
      await controller.shutdown();
      persistedState = await stateStore.load();
    }

    expect(persistedState?.masterVolume, 0.41);
    expect(persistedState?.favoriteSceneIds, contains('rain-cabin'));
    expect(persistedState?.savedPresets.single.name, '原生验收');
  });
}

Future<void> _pumpMotion(WidgetTester tester) async {
  for (var frame = 0; frame < 8; frame++) {
    await tester.pump(const Duration(milliseconds: 90));
  }
}
