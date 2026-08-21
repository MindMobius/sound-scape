import 'dart:convert';
import 'dart:io';

import 'package:path_provider/path_provider.dart';

import '../domain/soundscape_user_state.dart';
import 'soundscape_state_store.dart';

class LocalSoundscapeStateStore implements SoundscapeStateStore {
  LocalSoundscapeStateStore({this.directoryPathProvider});

  static const fileName = 'soundscape-state.v1.json';

  final Future<String> Function()? directoryPathProvider;
  Future<void> _pendingWrite = Future.value();

  @override
  Future<SoundscapeUserState?> load() async {
    await _pendingWrite;
    final file = await _stateFile();
    final backup = File('${file.path}.bak');
    if (!await file.exists() && await backup.exists()) {
      await backup.rename(file.path);
    }
    if (!await file.exists()) return null;
    final json = jsonDecode(await file.readAsString());
    return SoundscapeUserState.fromJson(
      (json as Map<Object?, Object?>).cast<String, Object?>(),
    );
  }

  @override
  Future<void> save(SoundscapeUserState state) {
    final operation = _pendingWrite.then((_) => _writeState(state));
    _pendingWrite = operation.catchError((Object _, StackTrace _) {});
    return operation;
  }

  Future<void> _writeState(SoundscapeUserState state) async {
    final file = await _stateFile();
    await file.parent.create(recursive: true);
    final temporary = File('${file.path}.tmp');
    final backup = File('${file.path}.bak');
    if (await temporary.exists()) await temporary.delete();
    await temporary.writeAsString(jsonEncode(state.toJson()), flush: true);
    if (!await file.exists()) {
      await temporary.rename(file.path);
      return;
    }
    if (await backup.exists()) await backup.delete();
    await file.rename(backup.path);
    try {
      await temporary.rename(file.path);
      await backup.delete();
    } catch (_) {
      if (!await file.exists() && await backup.exists()) {
        await backup.rename(file.path);
      }
      rethrow;
    }
  }

  Future<File> _stateFile() async {
    final path =
        await (directoryPathProvider?.call() ??
            getApplicationSupportDirectory().then(
              (directory) => directory.path,
            ));
    return File('$path${Platform.pathSeparator}$fileName');
  }
}
