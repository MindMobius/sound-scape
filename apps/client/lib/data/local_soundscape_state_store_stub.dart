import '../domain/soundscape_user_state.dart';
import 'soundscape_state_store.dart';

class LocalSoundscapeStateStore implements SoundscapeStateStore {
  LocalSoundscapeStateStore({Future<String> Function()? directoryPathProvider});

  SoundscapeUserState? _state;

  @override
  Future<SoundscapeUserState?> load() async => _state;

  @override
  Future<void> save(SoundscapeUserState state) async {
    _state = state;
  }
}
