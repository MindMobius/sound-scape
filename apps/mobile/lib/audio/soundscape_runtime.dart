import 'dart:async';
import 'dart:math';

import 'package:flutter/foundation.dart';
import 'package:flutter_soloud/flutter_soloud.dart';

import '../domain/soundscape_catalog.dart';
import '../domain/soundscape_scene.dart';
import 'soundscape_mix.dart';

enum SoundscapePhase { initializing, ready, playing, paused, stopped, failed }

@immutable
class SoundscapeSnapshot {
  const SoundscapeSnapshot({
    required this.phase,
    required this.scene,
    required this.masterVolume,
    required this.intensity,
    required this.richness,
    required this.layers,
    this.sleepTimerRemaining,
    this.error,
  });

  final SoundscapePhase phase;
  final SoundscapeScene scene;
  final double masterVolume;
  final double intensity;
  final double richness;
  final List<SoundLayerSnapshot> layers;
  final Duration? sleepTimerRemaining;
  final String? error;

  bool get isPlaying => phase == SoundscapePhase.playing;
  bool get isReady =>
      phase != SoundscapePhase.initializing && phase != SoundscapePhase.failed;
  int get activeLayerCount => layers.where((layer) => layer.enabled).length;

  String? get selectedPresetId {
    for (final preset in SoundscapeCatalog.presets) {
      if ((preset.intensity - intensity).abs() < 0.025 &&
          (preset.richness - richness).abs() < 0.025) {
        return preset.id;
      }
    }
    return null;
  }
}

class SoundscapeRuntime {
  final SoLoud _soloud = SoLoud.instance;
  final Random _random = Random(41827);
  final StreamController<SoundscapeSnapshot> _stateController =
      StreamController<SoundscapeSnapshot>.broadcast();
  final Map<String, AudioSource> _sources = {};
  final Map<String, SoundHandle> _loopHandles = {};
  final Map<SoundLayerKind, Bus> _buses = {};
  final List<SoundHandle> _eventHandles = [];
  final Map<String, Map<String, double>> _presenceByScene = {};
  final Map<String, Set<String>> _disabledByScene = {};
  final Map<String, double> _intensityByScene = {};
  final Map<String, double> _richnessByScene = {};

  Future<void>? _initialization;
  Timer? _modulationTimer;
  Timer? _eventTimer;
  SoundscapeScene _scene = SoundscapeCatalog.initialScene;
  SoundscapePhase _phase = SoundscapePhase.initializing;
  double _masterVolume = 0.52;
  Duration? _sleepTimerRemaining;
  bool _voicesReady = false;
  bool _ducked = false;
  String? _error;

  Stream<SoundscapeSnapshot> get states => _stateController.stream;

  SoundscapeSnapshot get current {
    final mix = _mix;
    final presence = _currentPresence;
    final disabled = _currentDisabled;
    return SoundscapeSnapshot(
      phase: _phase,
      scene: _scene,
      masterVolume: _masterVolume,
      intensity: _intensity,
      richness: _richness,
      sleepTimerRemaining: _sleepTimerRemaining,
      layers: List.unmodifiable(
        _scene.layers.map(
          (definition) => SoundLayerSnapshot(
            definition: definition,
            enabled: !disabled.contains(definition.id),
            presence: presence[definition.id] ?? 1,
            effectiveGain: mix.gainFor(definition.id),
          ),
        ),
      ),
      error: _error,
    );
  }

  double get _intensity =>
      _intensityByScene.putIfAbsent(_scene.id, () => _scene.defaultIntensity);

  double get _richness =>
      _richnessByScene.putIfAbsent(_scene.id, () => _scene.defaultRichness);

  Map<String, double> get _currentPresence =>
      _presenceByScene.putIfAbsent(_scene.id, () => {});

  Set<String> get _currentDisabled => _disabledByScene.putIfAbsent(
    _scene.id,
    () => {
      for (final layer in _scene.layers)
        if (!layer.enabledByDefault) layer.id,
    },
  );

  SoundscapeMix get _mix => SoundscapeMix.fromScene(
    scene: _scene,
    intensity: _intensity,
    richness: _richness,
    presence: _currentPresence,
    disabledLayers: _currentDisabled,
  );

  Future<void> initialize() => _initialization ??= _initialize();

  Future<void> _initialize() async {
    try {
      if (!_soloud.isInitialized) await _soloud.init();

      final assetPaths = <String>{
        for (final scene in SoundscapeCatalog.scenes)
          for (final layer in scene.layers) layer.assetPath,
      };
      for (final assetPath in assetPaths) {
        _sources[assetPath] = await _soloud.loadAsset(
          assetPath,
          mode: LoadMode.disk,
        );
      }

      _soloud.setGlobalVolume(_effectiveMasterVolume);
      _phase = SoundscapePhase.ready;
      _emit();
    } catch (error, stackTrace) {
      debugPrint(
        'Soundscape runtime initialization failed: $error\n$stackTrace',
      );
      _error = error.toString();
      _phase = SoundscapePhase.failed;
      _emit();
      rethrow;
    }
  }

  Future<void> play() async {
    await initialize();
    if (_phase == SoundscapePhase.failed || _phase == SoundscapePhase.playing) {
      return;
    }

    await _ensureVoices();
    _soloud.setGlobalVolume(0);
    _setVoicesPaused(false);
    _setBusesPaused(false);
    _soloud.fadeGlobalVolume(
      _effectiveMasterVolume,
      const Duration(milliseconds: 620),
    );
    _phase = SoundscapePhase.playing;
    _startDynamics();
    _emit();
  }

  Future<void> pause() async {
    if (_phase != SoundscapePhase.playing) return;

    _stopDynamics();
    _soloud.fadeGlobalVolume(0, const Duration(milliseconds: 420));
    await Future<void>.delayed(const Duration(milliseconds: 440));
    await _stopEventVoices();
    _setVoicesPaused(true);
    _setBusesPaused(true);
    _soloud.setGlobalVolume(_effectiveMasterVolume);
    _phase = SoundscapePhase.paused;
    _emit();
  }

  Future<void> stop() async {
    _stopDynamics();
    if (_soloud.isInitialized && _phase == SoundscapePhase.playing) {
      _soloud.fadeGlobalVolume(0, const Duration(milliseconds: 320));
      await Future<void>.delayed(const Duration(milliseconds: 340));
    }
    await _clearVoices();
    if (_soloud.isInitialized) _soloud.setGlobalVolume(_effectiveMasterVolume);
    _phase = SoundscapePhase.stopped;
    _emit();
  }

  Future<void> selectScene(
    SoundscapeScene scene, {
    bool autoplay = true,
  }) async {
    await initialize();
    if (scene.id == _scene.id) {
      if (autoplay && !current.isPlaying) await play();
      return;
    }

    final shouldPlay = autoplay || _phase == SoundscapePhase.playing;
    _stopDynamics();
    if (_voicesReady && _phase == SoundscapePhase.playing) {
      _soloud.fadeGlobalVolume(0, const Duration(milliseconds: 420));
      await Future<void>.delayed(const Duration(milliseconds: 440));
    }
    await _clearVoices();

    _scene = scene;
    _error = null;
    _phase = shouldPlay ? SoundscapePhase.ready : SoundscapePhase.paused;
    _emit();

    if (shouldPlay) await play();
  }

  void setMasterVolume(double value) {
    _masterVolume = value.clamp(0.0, 1.0);
    if (_soloud.isInitialized) {
      _soloud.fadeGlobalVolume(
        _effectiveMasterVolume,
        const Duration(milliseconds: 220),
      );
    }
    _emit();
  }

  void setIntensity(double value) {
    _intensityByScene[_scene.id] = value.clamp(0.0, 1.0);
    _applyMix();
    _emit();
  }

  void setRichness(double value) {
    _richnessByScene[_scene.id] = value.clamp(0.0, 1.0);
    _applyMix();
    if (_phase == SoundscapePhase.playing) {
      _eventTimer?.cancel();
      _scheduleNextEvent();
    }
    _emit();
  }

  void setLayerPresence(String layerId, double value) {
    if (!_scene.layers.any((layer) => layer.id == layerId)) return;
    _currentPresence[layerId] = value.clamp(0.0, 1.0);
    _applyMix();
    _emit();
  }

  void setLayerEnabled(String layerId, {required bool enabled}) {
    if (!_scene.layers.any((layer) => layer.id == layerId)) return;
    if (enabled) {
      _currentDisabled.remove(layerId);
    } else {
      _currentDisabled.add(layerId);
    }
    _applyMix();
    if (_phase == SoundscapePhase.playing) {
      _eventTimer?.cancel();
      _scheduleNextEvent();
    }
    _emit();
  }

  void applyPreset(ListeningPreset preset) {
    _intensityByScene[_scene.id] = preset.intensity.clamp(0.0, 1.0);
    _richnessByScene[_scene.id] = preset.richness.clamp(0.0, 1.0);
    _applyMix();
    if (_phase == SoundscapePhase.playing) {
      _eventTimer?.cancel();
      _scheduleNextEvent();
    }
    _emit();
  }

  void setSleepTimerRemaining(Duration? remaining) {
    _sleepTimerRemaining = remaining;
    _emit();
  }

  void setDucked(bool value) {
    _ducked = value;
    if (_soloud.isInitialized) {
      _soloud.fadeGlobalVolume(
        _effectiveMasterVolume,
        const Duration(milliseconds: 280),
      );
    }
  }

  Future<void> shutdown() async {
    await stop();
    await _stateController.close();
    if (_soloud.isInitialized) await _soloud.deinitAsync();
  }

  double get _effectiveMasterVolume => _masterVolume * (_ducked ? 0.22 : 1);

  Future<void> _ensureVoices() async {
    if (_voicesReady) return;

    _buses[SoundLayerKind.bed] = _soloud.createMixingBus(name: 'environment')
      ..playOnEngine(paused: true);
    _buses[SoundLayerKind.texture] = _soloud.createMixingBus(name: 'texture')
      ..playOnEngine(paused: true);
    _buses[SoundLayerKind.event] = _soloud.createMixingBus(name: 'events')
      ..playOnEngine(paused: true);

    final mix = _mix;
    for (final layer in _scene.layers) {
      if (layer.kind == SoundLayerKind.event) continue;
      final source = _sources[layer.assetPath];
      final bus = _buses[layer.kind];
      if (source == null || bus == null) {
        throw StateError('Sound source is not loaded: ${layer.assetPath}');
      }
      final handle = bus.play(
        source,
        volume: mix.gainFor(layer.id),
        pan: layer.pan,
        paused: true,
        looping: true,
      );
      _loopHandles[layer.id] = handle;
      if (layer.seekOffset > Duration.zero) {
        _soloud.seek(handle, layer.seekOffset);
      }
    }

    _voicesReady = true;
    _emit();
  }

  void _applyMix() {
    if (!_voicesReady || !_soloud.isInitialized) return;
    final mix = _mix;
    for (final layer in _scene.layers) {
      final handle = _loopHandles[layer.id];
      if (handle != null && _isValid(handle)) {
        _soloud.fadeVolume(
          handle,
          mix.gainFor(layer.id),
          const Duration(milliseconds: 720),
        );
      }
    }
  }

  void _setVoicesPaused(bool paused) {
    for (final handle in _loopHandles.values) {
      if (_isValid(handle)) _soloud.setPause(handle, paused);
    }
  }

  void _setBusesPaused(bool paused) {
    for (final bus in _buses.values) {
      final handle = bus.soundHandle;
      if (handle != null && _isValid(handle)) _soloud.setPause(handle, paused);
    }
  }

  Future<void> _clearVoices() async {
    await _stopEventVoices();
    for (final handle in _loopHandles.values) {
      if (_isValid(handle)) await _soloud.stop(handle);
    }
    for (final bus in _buses.values) {
      final handle = bus.soundHandle;
      if (handle != null && _isValid(handle)) await _soloud.stop(handle);
      if (bus.isActive) bus.dispose();
    }
    _loopHandles.clear();
    _buses.clear();
    _voicesReady = false;
  }

  void _startDynamics() {
    _stopDynamics();
    _modulationTimer = Timer.periodic(
      const Duration(seconds: 7),
      (_) => _modulateTextures(),
    );
    _scheduleNextEvent();
  }

  void _stopDynamics() {
    _modulationTimer?.cancel();
    _eventTimer?.cancel();
    _modulationTimer = null;
    _eventTimer = null;
  }

  void _modulateTextures() {
    if (_phase != SoundscapePhase.playing) return;
    final mix = _mix;
    for (final layer in _scene.layers.where(
      (layer) => layer.kind == SoundLayerKind.texture,
    )) {
      final handle = _loopHandles[layer.id];
      if (handle == null || !_isValid(handle)) continue;
      final target =
          mix.gainFor(layer.id) * (0.78 + (_random.nextDouble() * 0.34));
      _soloud.fadeVolume(handle, target, const Duration(seconds: 6));
      _soloud.fadePan(
        handle,
        (layer.pan - 0.16 + (_random.nextDouble() * 0.32)).clamp(-1.0, 1.0),
        const Duration(seconds: 6),
      );
    }
  }

  void _scheduleNextEvent() {
    if (_phase != SoundscapePhase.playing) return;
    final mix = _mix;
    final eventLayers = _scene.layers.where(
      (layer) =>
          layer.kind == SoundLayerKind.event && mix.gainFor(layer.id) > 0.001,
    );
    if (eventLayers.isEmpty) return;

    final baseSeconds = 15.0 - (mix.eventDensity * 9.0);
    final delay = Duration(
      milliseconds: ((baseSeconds + (_random.nextDouble() * 4.0)) * 1000)
          .round(),
    );
    _eventTimer = Timer(delay, () {
      if (_phase != SoundscapePhase.playing) return;
      final currentLayers = _scene.layers.where(
        (layer) =>
            layer.kind == SoundLayerKind.event &&
            _mix.gainFor(layer.id) > 0.001,
      );
      if (currentLayers.isEmpty) return;
      final choices = currentLayers.toList(growable: false);
      final layer = choices[_random.nextInt(choices.length)];
      final source = _sources[layer.assetPath];
      final eventBus = _buses[SoundLayerKind.event];
      if (source != null && eventBus != null) {
        final handle = eventBus.playScheduled(
          source,
          _soloud.getEngineTime() + const Duration(milliseconds: 240),
          duration: layer.eventDuration,
          volume:
              _mix.gainFor(layer.id) * (0.74 + (_random.nextDouble() * 0.28)),
          pan: (layer.pan - 0.34 + (_random.nextDouble() * 0.68)).clamp(
            -1.0,
            1.0,
          ),
        );
        _eventHandles
          ..removeWhere((item) => !_isValid(item))
          ..add(handle);
      }
      _scheduleNextEvent();
    });
  }

  Future<void> _stopEventVoices() async {
    for (final handle in _eventHandles) {
      if (_isValid(handle)) await _soloud.stop(handle);
    }
    _eventHandles.clear();
  }

  bool _isValid(SoundHandle handle) =>
      _soloud.isInitialized && _soloud.getIsValidVoiceHandle(handle);

  void _emit() {
    if (!_stateController.isClosed) _stateController.add(current);
  }
}
