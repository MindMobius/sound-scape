import 'dart:async';
import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../audio/soundscape_controller.dart';
import '../../audio/soundscape_runtime.dart';
import '../../domain/soundscape_catalog.dart';
import '../../domain/soundscape_scene.dart';
import '../player/player_control_rail.dart';
import '../player/soundscape_player_surface.dart';

part 'home_content.part.dart';
part 'scene_tile.part.dart';

class SoundscapeHomeScreen extends StatefulWidget {
  const SoundscapeHomeScreen({required this.audioController, super.key});

  final SoundscapeController audioController;

  @override
  State<SoundscapeHomeScreen> createState() => _SoundscapeHomeScreenState();
}

class _SoundscapeHomeScreenState extends State<SoundscapeHomeScreen>
    with TickerProviderStateMixin {
  late final AnimationController _playerExpansion;
  late final AnimationController _immersion;
  Timer? _chromeTimer;
  bool _expanded = false;
  bool _immersive = false;
  bool _chromeVisible = true;
  bool _transitioning = false;

  @override
  void initState() {
    super.initState();
    _playerExpansion = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 520),
      reverseDuration: const Duration(milliseconds: 460),
    );
    _immersion = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 420),
      reverseDuration: const Duration(milliseconds: 360),
    );
  }

  @override
  void dispose() {
    _chromeTimer?.cancel();
    _playerExpansion.dispose();
    _immersion.dispose();
    super.dispose();
  }

  Future<void> _togglePlayback(SoundscapeSnapshot snapshot) async {
    if (_transitioning || !snapshot.isReady) return;
    setState(() => _transitioning = true);
    try {
      if (snapshot.isPlaying) {
        await widget.audioController.pause();
        _showChrome(keepVisible: true);
      } else {
        await widget.audioController.play();
        if (_immersive) _showChrome();
      }
    } finally {
      if (mounted) setState(() => _transitioning = false);
    }
  }

  void _expandPlayer() {
    if (_expanded) return;
    setState(() => _expanded = true);
    _playerExpansion.forward();
  }

  Future<void> _collapsePlayer() async {
    if (_immersive) {
      await _leaveImmersive();
      return;
    }
    if (!_expanded) return;
    await _playerExpansion.reverse();
    if (mounted) setState(() => _expanded = false);
  }

  void _enterImmersive(SoundscapeSnapshot snapshot) {
    if (!_expanded || _immersive) return;
    setState(() {
      _immersive = true;
      _chromeVisible = true;
    });
    _immersion.forward();
    if (snapshot.isPlaying) _showChrome();
  }

  Future<void> _leaveImmersive() async {
    if (!_immersive) return;
    _chromeTimer?.cancel();
    if (mounted) setState(() => _chromeVisible = true);
    await _immersion.reverse();
    if (mounted) setState(() => _immersive = false);
  }

  void _showChrome({bool keepVisible = false}) {
    if (!_immersive) return;
    _chromeTimer?.cancel();
    if (!_chromeVisible && mounted) setState(() => _chromeVisible = true);
    if (keepVisible || !widget.audioController.snapshot.isPlaying) return;
    _chromeTimer = Timer(const Duration(seconds: 4), () {
      if (mounted && _immersive && widget.audioController.snapshot.isPlaying) {
        setState(() => _chromeVisible = false);
      }
    });
  }

  Future<void> _chooseScene(
    SoundscapeScene scene,
    SoundscapeSnapshot snapshot,
  ) async {
    if (_transitioning) return;
    if (scene.id == snapshot.scene.id && snapshot.isPlaying) {
      _expandPlayer();
      return;
    }
    setState(() => _transitioning = true);
    try {
      await widget.audioController.selectScene(scene.id, autoplay: true);
    } finally {
      if (mounted) setState(() => _transitioning = false);
    }
  }

  void _handleEscape() {
    if (_immersive) {
      unawaited(_leaveImmersive());
    } else if (_expanded) {
      unawaited(_collapsePlayer());
    }
  }

  @override
  Widget build(BuildContext context) {
    return StreamBuilder<SoundscapeSnapshot>(
      stream: widget.audioController.snapshots,
      initialData: widget.audioController.snapshot,
      builder: (context, stateSnapshot) {
        final snapshot = stateSnapshot.data ?? widget.audioController.snapshot;
        return PopScope(
          canPop: !_expanded,
          onPopInvokedWithResult: (didPop, result) {
            if (!didPop) _handleEscape();
          },
          child: CallbackShortcuts(
            bindings: <ShortcutActivator, VoidCallback>{
              const SingleActivator(LogicalKeyboardKey.escape): _handleEscape,
            },
            child: Focus(
              autofocus: true,
              child: LayoutBuilder(
                builder: (context, constraints) {
                  final safeBottom = MediaQuery.paddingOf(context).bottom;
                  final collapsedHeight = playerRailHeight + safeBottom;
                  return AnimatedBuilder(
                    animation: Listenable.merge([_playerExpansion, _immersion]),
                    builder: (context, child) {
                      final expansion = Curves.easeOutCubic.transform(
                        _playerExpansion.value,
                      );
                      final immersion = Curves.easeOutCubic.transform(
                        _immersion.value,
                      );
                      final playerHeight = lerpDouble(
                        collapsedHeight,
                        constraints.maxHeight,
                        expansion,
                      )!;
                      return Scaffold(
                        body: Stack(
                          fit: StackFit.expand,
                          children: [
                            _HomeContent(
                              snapshot: snapshot,
                              bottomPadding: collapsedHeight + 34,
                              transitioning: _transitioning,
                              onSceneTap: (scene) =>
                                  unawaited(_chooseScene(scene, snapshot)),
                            ),
                            Positioned(
                              left: 0,
                              right: 0,
                              bottom: 0,
                              height: playerHeight,
                              child: SoundscapePlayerSurface(
                                snapshot: snapshot,
                                controller: widget.audioController,
                                expansion: expansion,
                                immersion: immersion,
                                chromeVisible: _chromeVisible,
                                transitioning: _transitioning,
                                onInformationTap: _expanded
                                    ? null
                                    : _expandPlayer,
                                onTogglePlayback: () =>
                                    _togglePlayback(snapshot),
                                onArtworkTap: () => _enterImmersive(snapshot),
                                onTopRightTap: () {
                                  if (_immersive) {
                                    unawaited(_leaveImmersive());
                                  } else {
                                    unawaited(_collapsePlayer());
                                  }
                                },
                                onUserActivity: _showChrome,
                              ),
                            ),
                          ],
                        ),
                      );
                    },
                  );
                },
              ),
            ),
          ),
        );
      },
    );
  }
}
