import 'dart:async';

import 'package:audio_service/audio_service.dart';
import 'package:audio_session/audio_session.dart';

import '../domain/soundscape_catalog.dart';
import '../domain/soundscape_scene.dart';
import 'soundscape_controller.dart';
import 'soundscape_runtime.dart';

class SoundscapeAudioHandler extends BaseAudioHandler
    implements SoundscapeController {
  SoundscapeAudioHandler({SoundscapeRuntime? runtime})
    : runtime = runtime ?? SoundscapeRuntime() {
    ready = _initialize();
    ready.ignore();
  }

  final SoundscapeRuntime runtime;
  late final Future<void> ready;
  late final AudioSession _session;
  StreamSubscription<SoundscapeSnapshot>? _runtimeSubscription;
  StreamSubscription<void>? _noisySubscription;
  StreamSubscription<AudioInterruptionEvent>? _interruptionSubscription;
  Timer? _sleepTimer;
  DateTime? _sleepTimerEndsAt;
  bool _resumeAfterInterruption = false;

  @override
  SoundscapeSnapshot get snapshot => runtime.current;

  @override
  Stream<SoundscapeSnapshot> get snapshots => runtime.states;

  Future<void> _initialize() async {
    _runtimeSubscription = runtime.states.listen(_publishPlaybackState);
    await runtime.initialize();

    _session = await AudioSession.instance;
    await _session.configure(
      const AudioSessionConfiguration(
        androidWillPauseWhenDucked: false,
        androidAudioAttributes: AndroidAudioAttributes(
          usage: AndroidAudioUsage.media,
          contentType: AndroidAudioContentType.music,
        ),
        androidAudioFocusGainType: AndroidAudioFocusGainType.gain,
        avAudioSessionCategory: AVAudioSessionCategory.playback,
        avAudioSessionCategoryOptions: AVAudioSessionCategoryOptions.none,
      ),
    );

    _publishMediaItem(snapshot.scene);
    _listenForInterruptions();
    _publishPlaybackState(runtime.current);
  }

  @override
  Future<void> play() async {
    await ready;
    if (!await _session.setActive(true)) return;
    await runtime.play();
  }

  @override
  Future<void> pause() async {
    await ready;
    await runtime.pause();
  }

  @override
  Future<void> stop() async {
    await ready;
    _cancelSleepTimer();
    await runtime.stop();
    await _session.setActive(false);
    await super.stop();
  }

  @override
  void setMasterVolume(double value) => runtime.setMasterVolume(value);

  @override
  void setIntensity(double value) => runtime.setIntensity(value);

  @override
  void setRichness(double value) => runtime.setRichness(value);

  @override
  Future<void> selectScene(String sceneId, {bool autoplay = true}) async {
    await ready;
    if (autoplay && !await _session.setActive(true)) return;
    final scene = SoundscapeCatalog.byId(sceneId);
    await runtime.selectScene(scene, autoplay: autoplay);
    _publishMediaItem(scene);
  }

  @override
  void setLayerPresence(String layerId, double value) =>
      runtime.setLayerPresence(layerId, value);

  @override
  void setLayerEnabled(String layerId, {required bool enabled}) =>
      runtime.setLayerEnabled(layerId, enabled: enabled);

  @override
  void applyPreset(ListeningPreset preset) => runtime.applyPreset(preset);

  @override
  void setSceneFavorite(String sceneId, {required bool favorite}) =>
      runtime.setSceneFavorite(sceneId, favorite: favorite);

  @override
  void saveCurrentAsPreset({required String id, required String name}) =>
      runtime.saveCurrentAsPreset(id: id, name: name);

  @override
  void deleteSavedPreset(String presetId) =>
      runtime.deleteSavedPreset(presetId);

  @override
  Future<void> applySavedPreset(String presetId) =>
      runtime.applySavedPreset(presetId);

  @override
  void setSleepTimer(Duration? duration) {
    _sleepTimer?.cancel();
    _sleepTimer = null;
    _sleepTimerEndsAt = null;
    if (duration == null || duration <= Duration.zero) {
      runtime.setSleepTimerRemaining(null);
      return;
    }

    _sleepTimerEndsAt = DateTime.now().add(duration);
    runtime.setSleepTimerRemaining(duration);
    _sleepTimer = Timer.periodic(const Duration(seconds: 1), (_) {
      final endsAt = _sleepTimerEndsAt;
      if (endsAt == null) return;
      final remaining = endsAt.difference(DateTime.now());
      if (remaining <= Duration.zero) {
        _cancelSleepTimer();
        unawaited(pause());
      } else {
        runtime.setSleepTimerRemaining(remaining);
      }
    });
  }

  void _cancelSleepTimer() {
    _sleepTimer?.cancel();
    _sleepTimer = null;
    _sleepTimerEndsAt = null;
    runtime.setSleepTimerRemaining(null);
  }

  void _publishMediaItem(SoundscapeScene scene) {
    mediaItem.add(
      MediaItem(
        id: scene.id,
        album: '动态自然声景',
        title: scene.name,
        artist: '声景',
        playable: true,
      ),
    );
  }

  void _publishPlaybackState(SoundscapeSnapshot snapshot) {
    final isPlaying = snapshot.phase == SoundscapePhase.playing;
    final canStop =
        snapshot.phase == SoundscapePhase.playing ||
        snapshot.phase == SoundscapePhase.paused;
    playbackState.add(
      PlaybackState(
        controls: [
          if (isPlaying) MediaControl.pause else MediaControl.play,
          if (canStop) MediaControl.stop,
        ],
        systemActions: const {
          MediaAction.play,
          MediaAction.pause,
          MediaAction.stop,
        },
        androidCompactActionIndices: const [0],
        processingState: switch (snapshot.phase) {
          SoundscapePhase.initializing => AudioProcessingState.loading,
          SoundscapePhase.failed => AudioProcessingState.error,
          SoundscapePhase.stopped => AudioProcessingState.idle,
          _ => AudioProcessingState.ready,
        },
        playing: isPlaying,
      ),
    );
  }

  void _listenForInterruptions() {
    _noisySubscription = _session.becomingNoisyEventStream.listen((_) {
      pause();
    });
    _interruptionSubscription = _session.interruptionEventStream.listen((
      event,
    ) {
      if (event.begin) {
        if (event.type == AudioInterruptionType.duck) {
          runtime.setDucked(true);
        } else {
          _resumeAfterInterruption = snapshot.isPlaying;
          pause();
        }
      } else if (event.type == AudioInterruptionType.duck) {
        runtime.setDucked(false);
      } else if (_resumeAfterInterruption) {
        _resumeAfterInterruption = false;
        play();
      }
    });
  }

  Future<void> shutdown() async {
    _sleepTimer?.cancel();
    await _runtimeSubscription?.cancel();
    await _noisySubscription?.cancel();
    await _interruptionSubscription?.cancel();
    await runtime.shutdown();
  }
}
