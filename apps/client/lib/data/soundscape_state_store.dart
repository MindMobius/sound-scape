import '../domain/soundscape_user_state.dart';

abstract interface class SoundscapeStateStore {
  Future<SoundscapeUserState?> load();

  Future<void> save(SoundscapeUserState state);
}

class MemorySoundscapeStateStore implements SoundscapeStateStore {
  SoundscapeUserState? state;

  @override
  Future<SoundscapeUserState?> load() async => state;

  @override
  Future<void> save(SoundscapeUserState state) async {
    this.state = state;
  }
}
