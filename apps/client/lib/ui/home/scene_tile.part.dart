part of 'soundscape_home_screen.dart';

class _SceneTile extends StatefulWidget {
  const _SceneTile({
    required this.scene,
    required this.selected,
    required this.playing,
    required this.transitioning,
    required this.onTap,
  });

  final SoundscapeScene scene;
  final bool selected;
  final bool playing;
  final bool transitioning;
  final VoidCallback onTap;

  @override
  State<_SceneTile> createState() => _SceneTileState();
}

class _SceneTileState extends State<_SceneTile> {
  bool _hovered = false;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final status = widget.playing
        ? '正在聆听'
        : widget.selected
        ? '继续聆听'
        : '开始聆听';
    return Semantics(
      button: true,
      selected: widget.selected,
      label: '${widget.scene.name}，$status',
      child: MouseRegion(
        cursor: SystemMouseCursors.click,
        onEnter: (_) => setState(() => _hovered = true),
        onExit: (_) => setState(() => _hovered = false),
        child: InkWell(
          onTap: widget.onTap,
          borderRadius: BorderRadius.circular(8),
          child: Padding(
            padding: const EdgeInsets.only(bottom: 4),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                AnimatedContainer(
                  duration: const Duration(milliseconds: 300),
                  curve: Curves.easeOutCubic,
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(
                      color: widget.selected
                          ? theme.colorScheme.primary.withValues(alpha: 0.64)
                          : Colors.transparent,
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(
                          alpha: _hovered ? 0.14 : 0.08,
                        ),
                        offset: Offset(0, _hovered ? 16 : 11),
                        blurRadius: _hovered ? 34 : 26,
                      ),
                    ],
                  ),
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(7),
                    child: AspectRatio(
                      aspectRatio: 1.48,
                      child: Image.asset(
                        widget.scene.coverAsset,
                        fit: BoxFit.cover,
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 18),
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            widget.scene.name,
                            style: theme.textTheme.titleLarge,
                          ),
                          const SizedBox(height: 6),
                          Text(
                            widget.scene.description,
                            style: theme.textTheme.bodyMedium?.copyWith(
                              color: theme.textTheme.bodySmall?.color,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 16),
                    Padding(
                      padding: const EdgeInsets.only(top: 3),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          if (widget.transitioning)
                            SizedBox.square(
                              dimension: 13,
                              child: CircularProgressIndicator(
                                strokeWidth: 1.5,
                                color: theme.colorScheme.primary,
                              ),
                            )
                          else
                            Container(
                              width: 5,
                              height: 5,
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                color: widget.selected
                                    ? theme.colorScheme.primary
                                    : theme.dividerColor,
                              ),
                            ),
                          const SizedBox(width: 7),
                          Text(
                            status,
                            style: theme.textTheme.labelLarge?.copyWith(
                              color: widget.selected
                                  ? theme.colorScheme.primary
                                  : theme.textTheme.bodySmall?.color,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
