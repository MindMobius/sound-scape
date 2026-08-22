part of 'soundscape_player_surface.dart';

class _ImmersiveBackdrop extends StatelessWidget {
  const _ImmersiveBackdrop({required this.snapshot, required this.onActivity});

  final SoundscapeSnapshot snapshot;
  final VoidCallback onActivity;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: onActivity,
      child: Stack(
        fit: StackFit.expand,
        children: [
          Image.asset(snapshot.scene.heroAsset, fit: BoxFit.cover),
          ColoredBox(color: Colors.black.withValues(alpha: 0.32)),
          SafeArea(
            child: Center(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 32),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      snapshot.scene.name,
                      textAlign: TextAlign.center,
                      style: Theme.of(context).textTheme.displayLarge?.copyWith(
                        color: Colors.white,
                        fontSize: MediaQuery.sizeOf(context).width < 600
                            ? 39
                            : 52,
                      ),
                    ),
                    const SizedBox(height: 15),
                    Text(
                      snapshot.scene.description,
                      textAlign: TextAlign.center,
                      style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                        color: Colors.white.withValues(alpha: 0.72),
                        height: 1.7,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
