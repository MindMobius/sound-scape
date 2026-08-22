import '../domain/sound_asset.dart';
import '../domain/soundscape_scene.dart';

class ScheduledSoundEvent {
  const ScheduledSoundEvent({
    required this.delay,
    required this.segment,
    required this.duration,
    required this.gainScale,
    required this.pan,
    this.bridgeSegment,
  });

  final Duration delay;
  final SoundSegment segment;
  final Duration duration;
  final double gainScale;
  final double pan;
  final SoundSegment? bridgeSegment;
}

class ScheduledTextureChange {
  const ScheduledTextureChange({
    required this.delay,
    required this.transition,
    required this.gainScale,
    required this.pan,
  });

  final Duration delay;
  final Duration transition;
  final double gainScale;
  final double pan;
}

class SoundscapeScheduler {
  SoundscapeScheduler({required this.scene, required this.library});

  final SoundscapeScene scene;
  final SoundLibrary library;
  final Map<String, _DeterministicRandom> _randomStreams = {};
  final Map<String, String> _previousSegmentByLayer = {};

  ScheduledSoundEvent nextEvent({
    required SoundLayerDefinition layer,
    required double density,
  }) {
    if (layer.kind != SoundLayerKind.event) {
      throw ArgumentError.value(layer.kind, 'layer.kind', 'must be event');
    }
    final asset = library.assetById(layer.assetId);
    final candidates = [
      for (final segmentId in layer.segmentIds) asset.segmentById(segmentId),
    ];
    if (candidates.isEmpty) {
      throw StateError('${scene.id}/${layer.id} has no event segments.');
    }

    final random = _streamFor(layer.id, 'event');
    final previousId = _previousSegmentByLayer[layer.id];
    final selectable =
        layer.eventPolicy.noImmediateRepeat &&
            candidates.length > 1 &&
            previousId != null
        ? candidates.where((segment) => segment.id != previousId).toList()
        : candidates;
    final segment = selectable[random.nextInt(selectable.length)];
    _previousSegmentByLayer[layer.id] = segment.id;

    final safeDensity = density.clamp(0.0, 1.0);
    final frequencyScale = _lerp(1.18, 0.54, safeDensity);
    final minimumDelayMs =
        (layer.eventPolicy.minimumSilence.inMilliseconds * frequencyScale)
            .round();
    final maximumDelayMs =
        (layer.eventPolicy.maximumSilence.inMilliseconds * frequencyScale)
            .round();
    final variation = layer.dynamics.gainVariation.clamp(0.0, 0.95);
    final panVariation = layer.dynamics.panVariation.clamp(0.0, 1.0);
    final bridgeId = segment.bridgeSegmentId;

    return ScheduledSoundEvent(
      delay: Duration(
        milliseconds: _randomIntBetween(random, minimumDelayMs, maximumDelayMs),
      ),
      segment: segment,
      duration: segment.duration ?? const Duration(seconds: 3),
      gainScale: _randomDoubleBetween(random, 1 - variation, 1 + variation),
      pan: _randomDoubleBetween(
        random,
        layer.pan - panVariation,
        layer.pan + panVariation,
      ).clamp(-1.0, 1.0),
      bridgeSegment: bridgeId == null ? null : asset.segmentById(bridgeId),
    );
  }

  ScheduledTextureChange nextTextureChange(SoundLayerDefinition layer) {
    if (layer.kind != SoundLayerKind.texture) {
      throw ArgumentError.value(layer.kind, 'layer.kind', 'must be texture');
    }
    final random = _streamFor(layer.id, 'texture');
    final dynamics = layer.dynamics;
    final variation = dynamics.gainVariation.clamp(0.0, 0.95);
    final panVariation = dynamics.panVariation.clamp(0.0, 1.0);
    return ScheduledTextureChange(
      delay: Duration(
        milliseconds: _randomIntBetween(
          random,
          dynamics.minimumChangeInterval.inMilliseconds,
          dynamics.maximumChangeInterval.inMilliseconds,
        ),
      ),
      transition: Duration(
        milliseconds: _randomIntBetween(
          random,
          dynamics.minimumTransition.inMilliseconds,
          dynamics.maximumTransition.inMilliseconds,
        ),
      ),
      gainScale: _randomDoubleBetween(random, 1 - variation, 1 + variation),
      pan: _randomDoubleBetween(
        random,
        layer.pan - panVariation,
        layer.pan + panVariation,
      ).clamp(-1.0, 1.0),
    );
  }

  _DeterministicRandom _streamFor(String layerId, String purpose) {
    final key = '$layerId:$purpose';
    return _randomStreams.putIfAbsent(
      key,
      () => _DeterministicRandom(scene.seed ^ _stableHash(key)),
    );
  }
}

double _lerp(double start, double end, double amount) {
  return start + ((end - start) * amount);
}

int _randomIntBetween(_DeterministicRandom random, int minimum, int maximum) {
  if (maximum <= minimum) return minimum;
  return minimum + random.nextInt((maximum - minimum) + 1);
}

double _randomDoubleBetween(
  _DeterministicRandom random,
  double minimum,
  double maximum,
) {
  if (maximum <= minimum) return minimum;
  return minimum + ((maximum - minimum) * random.nextDouble());
}

int _stableHash(String value) {
  var hash = 0x811c9dc5;
  for (final codeUnit in value.codeUnits) {
    hash ^= codeUnit;
    hash = (hash * 0x01000193) & 0xffffffff;
  }
  return hash;
}

class _DeterministicRandom {
  _DeterministicRandom(int seed)
    : _state = (seed & 0xffffffff) == 0 ? 0x6d2b79f5 : seed & 0xffffffff;

  int _state;

  int nextInt(int maximum) {
    if (maximum <= 0) throw ArgumentError.value(maximum, 'maximum');
    return _nextUint32() % maximum;
  }

  double nextDouble() => _nextUint32() / 0x100000000;

  int _nextUint32() {
    var value = _state;
    value ^= (value << 13) & 0xffffffff;
    value ^= value >> 17;
    value ^= (value << 5) & 0xffffffff;
    _state = value & 0xffffffff;
    return _state;
  }
}
