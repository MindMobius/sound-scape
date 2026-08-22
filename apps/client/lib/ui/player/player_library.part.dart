part of 'soundscape_player_surface.dart';

class _LayerCollection extends StatelessWidget {
  const _LayerCollection({required this.snapshot, required this.controller});

  final SoundscapeSnapshot snapshot;
  final SoundscapeController controller;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final dark = theme.brightness == Brightness.dark;
    final compact = MediaQuery.sizeOf(context).width < 680;
    return ColoredBox(
      color: dark ? SoundscapeColors.darkGround : SoundscapeColors.ground,
      child: Padding(
        padding: EdgeInsets.fromLTRB(
          compact ? 20 : 32,
          compact ? 50 : 66,
          compact ? 20 : 32,
          156,
        ),
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 920),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('让这一处声音，更像你此刻想听的样子。', style: theme.textTheme.titleLarge),
                const SizedBox(height: 12),
                ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 620),
                  child: Text(
                    '先听它自然变化。想靠近某一种声音，或放进自己的录音时，再从这里慢慢调整。',
                    style: theme.textTheme.bodyMedium?.copyWith(
                      color: theme.textTheme.bodySmall?.color,
                      height: 1.7,
                    ),
                  ),
                ),
                const SizedBox(height: 48),
                _CurrentSoundLayers(snapshot: snapshot, controller: controller),
                const SizedBox(height: 68),
                _SoundLibrarySection(
                  snapshot: snapshot,
                  controller: controller,
                ),
                const SizedBox(height: 68),
                _SavedMomentsSection(
                  snapshot: snapshot,
                  controller: controller,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _CurrentSoundLayers extends StatelessWidget {
  const _CurrentSoundLayers({required this.snapshot, required this.controller});

  final SoundscapeSnapshot snapshot;
  final SoundscapeController controller;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('此处正在发声', style: theme.textTheme.titleMedium),
        const SizedBox(height: 8),
        Text(
          '${snapshot.activeLayerCount} 种声音随场景缓慢变化',
          style: theme.textTheme.bodySmall,
        ),
        const SizedBox(height: 20),
        for (var index = 0; index < snapshot.layers.length; index++) ...[
          if (index > 0) Divider(height: 1, color: theme.dividerColor),
          _LayerRow(
            key: ValueKey(
              'sound-layer-${snapshot.layers[index].definition.id}',
            ),
            layer: snapshot.layers[index],
            controller: controller,
          ),
        ],
      ],
    );
  }
}

class _LayerRow extends StatefulWidget {
  const _LayerRow({required this.layer, required this.controller, super.key});

  final SoundLayerSnapshot layer;
  final SoundscapeController controller;

  @override
  State<_LayerRow> createState() => _LayerRowState();
}

class _LayerRowState extends State<_LayerRow> {
  bool _removing = false;

  String get _descriptor => switch (widget.layer.definition.kind) {
    SoundLayerKind.bed => '一直在',
    SoundLayerKind.texture => '缓缓变化',
    SoundLayerKind.event => '偶尔响起',
  };

  Future<void> _remove() async {
    if (_removing) return;
    setState(() => _removing = true);
    try {
      await widget.controller.removeSoundLayer(widget.layer.definition.id);
    } catch (_) {
      if (mounted) {
        _showSoundscapeMessage(context, '暂时无法移开这段声音，请稍后再试。');
      }
    } finally {
      if (mounted) setState(() => _removing = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final compact = constraints.maxWidth < 650;
        return Padding(
          padding: const EdgeInsets.symmetric(vertical: 20),
          child: compact ? _buildCompact(context) : _buildWide(context),
        );
      },
    );
  }

  Widget _buildWide(BuildContext context) {
    return Row(
      children: [
        Expanded(flex: 4, child: _buildIdentity(context)),
        const SizedBox(width: 18),
        Expanded(flex: 5, child: _buildPresence(context)),
        const SizedBox(width: 18),
        SizedBox(width: 158, child: _buildCharacter(context)),
        const SizedBox(width: 8),
        _buildToggle(context),
        if (widget.layer.userAdded) ...[
          const SizedBox(width: 2),
          _buildRemove(context),
        ],
      ],
    );
  }

  Widget _buildCompact(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          children: [
            Expanded(child: _buildIdentity(context)),
            _buildToggle(context),
            if (widget.layer.userAdded) _buildRemove(context),
          ],
        ),
        const SizedBox(height: 14),
        _buildPresence(context),
        const SizedBox(height: 12),
        Align(
          alignment: AlignmentDirectional.centerStart,
          child: SizedBox(width: 196, child: _buildCharacter(context)),
        ),
      ],
    );
  }

  Widget _buildIdentity(BuildContext context) {
    final theme = Theme.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          widget.layer.definition.name,
          maxLines: 2,
          overflow: TextOverflow.ellipsis,
          style: theme.textTheme.titleMedium,
        ),
        const SizedBox(height: 3),
        Text(_descriptor, style: theme.textTheme.bodySmall),
      ],
    );
  }

  Widget _buildPresence(BuildContext context) {
    final secondary = Theme.of(context).textTheme.bodySmall?.color;
    return Row(
      children: [
        Text('远', style: TextStyle(color: secondary)),
        Expanded(
          child: Semantics(
            label: '${widget.layer.definition.name}的远近',
            value: '${(widget.layer.presence * 100).round()}%',
            child: Slider(
              value: widget.layer.presence,
              onChanged: widget.layer.enabled
                  ? (value) => widget.controller.setLayerPresence(
                      widget.layer.definition.id,
                      value,
                    )
                  : null,
              semanticFormatterCallback: (value) => '${(value * 100).round()}%',
            ),
          ),
        ),
        Text('近', style: TextStyle(color: secondary)),
      ],
    );
  }

  Widget _buildCharacter(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      height: 48,
      padding: const EdgeInsetsDirectional.only(start: 12, end: 8),
      decoration: BoxDecoration(
        border: Border.all(color: theme.dividerColor),
        borderRadius: BorderRadius.circular(7),
      ),
      child: DropdownButtonHideUnderline(
        child: DropdownButton<SoundCharacter>(
          key: ValueKey('layer-character-${widget.layer.definition.id}'),
          value: widget.layer.character,
          isExpanded: true,
          borderRadius: BorderRadius.circular(8),
          icon: const Icon(Icons.expand_more_rounded, size: 19),
          items: [
            for (final character in SoundCharacter.values)
              DropdownMenuItem(
                value: character,
                child: Text(
                  _soundCharacterLabel(character),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: theme.textTheme.labelLarge,
                ),
              ),
          ],
          onChanged: (character) {
            if (character != null) {
              widget.controller.setLayerCharacter(
                widget.layer.definition.id,
                character,
              );
            }
          },
        ),
      ),
    );
  }

  Widget _buildToggle(BuildContext context) {
    return Semantics(
      label: '${widget.layer.definition.name}开关',
      child: Switch(
        value: widget.layer.enabled,
        onChanged: (enabled) => widget.controller.setLayerEnabled(
          widget.layer.definition.id,
          enabled: enabled,
        ),
      ),
    );
  }

  Widget _buildRemove(BuildContext context) {
    return IconButton(
      key: ValueKey('remove-layer-${widget.layer.definition.id}'),
      tooltip: '从此处移开',
      onPressed: _removing ? null : () => unawaited(_remove()),
      icon: _removing
          ? const SizedBox.square(
              dimension: 17,
              child: CircularProgressIndicator(strokeWidth: 1.6),
            )
          : const Icon(Icons.close_rounded, size: 20),
    );
  }
}

enum _SoundLibraryCategory { environment, event, media, mine }

class _SoundLibrarySection extends StatefulWidget {
  const _SoundLibrarySection({
    required this.snapshot,
    required this.controller,
  });

  final SoundscapeSnapshot snapshot;
  final SoundscapeController controller;

  @override
  State<_SoundLibrarySection> createState() => _SoundLibrarySectionState();
}

class _SoundLibrarySectionState extends State<_SoundLibrarySection>
    with SingleTickerProviderStateMixin {
  late final TabController _tabs;
  final Set<String> _busyAssetIds = {};
  bool _importing = false;

  _SoundLibraryCategory get _category =>
      _SoundLibraryCategory.values[_tabs.index];

  @override
  void initState() {
    super.initState();
    _tabs = TabController(
      length: _SoundLibraryCategory.values.length,
      vsync: this,
    )..addListener(_handleTabChange);
  }

  @override
  void dispose() {
    _tabs
      ..removeListener(_handleTabChange)
      ..dispose();
    super.dispose();
  }

  void _handleTabChange() {
    if (mounted) setState(() {});
  }

  List<SoundAsset> get _visibleAssets {
    return [
      for (final asset in widget.snapshot.soundAssets)
        if (_matchesCategory(asset, _category)) asset,
    ];
  }

  Future<void> _add(SoundAsset asset) async {
    if (_busyAssetIds.contains(asset.id)) return;
    setState(() => _busyAssetIds.add(asset.id));
    try {
      await widget.controller.addSoundAsset(asset.id);
      if (mounted) {
        _showSoundscapeMessage(context, '「${asset.name.resolve()}」已加入此处。');
      }
    } catch (_) {
      if (mounted) {
        _showSoundscapeMessage(context, '这段声音暂时无法播放，原来的声景没有被打断。');
      }
    } finally {
      if (mounted) setState(() => _busyAssetIds.remove(asset.id));
    }
  }

  Future<void> _importAndAdd() async {
    if (_importing) return;
    setState(() => _importing = true);
    try {
      final asset = await widget.controller.importSound();
      if (asset == null) return;
      await widget.controller.addSoundAsset(asset.id);
      if (mounted) {
        _showSoundscapeMessage(context, '「${asset.name.resolve()}」已加入此处。');
      }
    } on FormatException {
      if (mounted) {
        _showSoundscapeMessage(
          context,
          '这个文件无法使用，请选择 AAC、FLAC、M4A、MP3、OGG、OPUS 或 WAV。',
        );
      }
    } catch (_) {
      if (mounted) {
        _showSoundscapeMessage(context, '没有成功加入这段声音，当前播放仍会继续。');
      }
    } finally {
      if (mounted) setState(() => _importing = false);
    }
  }

  Future<void> _rename(SoundAsset asset) async {
    final name = await _requestName(
      context,
      title: '给这段声音换个名字',
      initialValue: asset.name.resolve(),
      confirmLabel: '保存',
    );
    if (name == null || !mounted) return;
    widget.controller.renameImportedSound(asset.id, name);
    _showSoundscapeMessage(context, '名字已保存。');
  }

  Future<void> _delete(SoundAsset asset) async {
    final confirmed = await _confirmAction(
      context,
      title: '删除「${asset.name.resolve()}」？',
      message: '它会从所有声景和已保存的片刻中移除，并删除应用保存的副本。你的原始文件不受影响。',
      confirmLabel: '删除',
    );
    if (!confirmed || !mounted) return;
    setState(() => _busyAssetIds.add(asset.id));
    try {
      await widget.controller.deleteImportedSound(asset.id);
      if (mounted) _showSoundscapeMessage(context, '这段声音已删除。');
    } catch (_) {
      if (mounted) {
        _showSoundscapeMessage(context, '暂时无法删除这段声音，请稍后再试。');
      }
    } finally {
      if (mounted) setState(() => _busyAssetIds.remove(asset.id));
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final assets = _visibleAssets;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            Expanded(child: Text('添加声音', style: theme.textTheme.titleMedium)),
            if (_category == _SoundLibraryCategory.mine)
              OutlinedButton.icon(
                key: const ValueKey('import-sound'),
                onPressed: _importing ? null : () => unawaited(_importAndAdd()),
                icon: _importing
                    ? const SizedBox.square(
                        dimension: 16,
                        child: CircularProgressIndicator(strokeWidth: 1.6),
                      )
                    : const Icon(Icons.add_rounded, size: 19),
                label: const Text('导入并加入'),
              ),
          ],
        ),
        const SizedBox(height: 18),
        TabBar(
          controller: _tabs,
          isScrollable: true,
          tabAlignment: TabAlignment.start,
          dividerHeight: 1,
          tabs: const [
            Tab(key: ValueKey('library-tab-environment'), text: '环境'),
            Tab(key: ValueKey('library-tab-event'), text: '事件'),
            Tab(key: ValueKey('library-tab-media'), text: '媒介'),
            Tab(key: ValueKey('library-tab-mine'), text: '我的声音'),
          ],
        ),
        const SizedBox(height: 12),
        if (assets.isEmpty)
          _LibraryEmptyState(
            mine: _category == _SoundLibraryCategory.mine,
            importing: _importing,
            onImport: () => unawaited(_importAndAdd()),
          )
        else
          for (var index = 0; index < assets.length; index++) ...[
            if (index > 0) Divider(height: 1, color: theme.dividerColor),
            _LibraryAssetRow(
              asset: assets[index],
              importedRecord: _importedRecord(assets[index].id),
              inScene: widget.snapshot.containsSoundAsset(assets[index].id),
              busy: _busyAssetIds.contains(assets[index].id),
              onAdd: () => unawaited(_add(assets[index])),
              onRename:
                  assets[index].availability == SoundAssetAvailability.imported
                  ? () => unawaited(_rename(assets[index]))
                  : null,
              onDelete:
                  assets[index].availability == SoundAssetAvailability.imported
                  ? () => unawaited(_delete(assets[index]))
                  : null,
            ),
          ],
      ],
    );
  }

  ImportedSoundRecord? _importedRecord(String assetId) {
    for (final record in widget.snapshot.importedSounds) {
      if (record.asset.id == assetId) return record;
    }
    return null;
  }
}

class _LibraryEmptyState extends StatelessWidget {
  const _LibraryEmptyState({
    required this.mine,
    required this.importing,
    required this.onImport,
  });

  final bool mine;
  final bool importing;
  final VoidCallback onImport;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 30),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            mine ? '这里还没有你的声音。' : '这一类暂时没有可用声音。',
            style: theme.textTheme.bodyMedium?.copyWith(
              color: theme.textTheme.bodySmall?.color,
            ),
          ),
          if (mine) ...[
            const SizedBox(height: 14),
            TextButton.icon(
              onPressed: importing ? null : onImport,
              icon: const Icon(Icons.add_rounded, size: 18),
              label: const Text('选择本地音频'),
            ),
          ],
        ],
      ),
    );
  }
}

class _LibraryAssetRow extends StatelessWidget {
  const _LibraryAssetRow({
    required this.asset,
    required this.importedRecord,
    required this.inScene,
    required this.busy,
    required this.onAdd,
    required this.onRename,
    required this.onDelete,
  });

  final SoundAsset asset;
  final ImportedSoundRecord? importedRecord;
  final bool inScene;
  final bool busy;
  final VoidCallback onAdd;
  final VoidCallback? onRename;
  final VoidCallback? onDelete;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 15),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  asset.name.resolve(),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: theme.textTheme.titleMedium,
                ),
                const SizedBox(height: 3),
                Text(
                  _assetDescriptor(asset, importedRecord),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: theme.textTheme.bodySmall,
                ),
              ],
            ),
          ),
          const SizedBox(width: 16),
          if (inScene)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 10),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(
                    Icons.check_rounded,
                    size: 18,
                    color: theme.colorScheme.primary,
                  ),
                  const SizedBox(width: 5),
                  Text(
                    '已在此处',
                    style: theme.textTheme.labelLarge?.copyWith(
                      color: theme.colorScheme.primary,
                    ),
                  ),
                ],
              ),
            )
          else
            TextButton.icon(
              key: ValueKey('asset-add-${asset.id}'),
              onPressed: busy ? null : onAdd,
              icon: busy
                  ? const SizedBox.square(
                      dimension: 15,
                      child: CircularProgressIndicator(strokeWidth: 1.5),
                    )
                  : const Icon(Icons.add_rounded, size: 18),
              label: const Text('加入'),
            ),
          if (onRename != null && onDelete != null)
            MenuAnchor(
              menuChildren: [
                MenuItemButton(
                  onPressed: busy ? null : onRename,
                  leadingIcon: const Icon(Icons.edit_outlined, size: 19),
                  child: const Text('重命名'),
                ),
                MenuItemButton(
                  onPressed: busy ? null : onDelete,
                  leadingIcon: const Icon(
                    Icons.delete_outline_rounded,
                    size: 19,
                  ),
                  child: const Text('删除文件'),
                ),
              ],
              builder: (context, menuController, child) => IconButton(
                key: ValueKey('asset-menu-${asset.id}'),
                tooltip: '更多操作',
                onPressed: busy
                    ? null
                    : () {
                        menuController.isOpen
                            ? menuController.close()
                            : menuController.open();
                      },
                icon: const Icon(Icons.more_horiz_rounded, size: 21),
              ),
            ),
        ],
      ),
    );
  }
}

class _SavedMomentsSection extends StatefulWidget {
  const _SavedMomentsSection({
    required this.snapshot,
    required this.controller,
  });

  final SoundscapeSnapshot snapshot;
  final SoundscapeController controller;

  @override
  State<_SavedMomentsSection> createState() => _SavedMomentsSectionState();
}

class _SavedMomentsSectionState extends State<_SavedMomentsSection> {
  String? _busyPresetId;

  Future<void> _save() async {
    final name = await _requestName(
      context,
      title: '存下此刻',
      initialValue: '${widget.snapshot.scene.name}的片刻',
      confirmLabel: '存下',
    );
    if (name == null || !mounted) return;
    widget.controller.saveCurrentAsPreset(
      id: 'moment-${DateTime.now().microsecondsSinceEpoch}',
      name: name,
    );
    _showSoundscapeMessage(context, '此刻已经留在这里。');
  }

  Future<void> _apply(SavedSoundscapePreset preset) async {
    if (_busyPresetId != null) return;
    setState(() => _busyPresetId = preset.id);
    try {
      await widget.controller.applySavedPreset(preset.id);
      if (mounted) _showSoundscapeMessage(context, '已回到「${preset.name}」。');
    } catch (_) {
      if (mounted) _showSoundscapeMessage(context, '暂时无法回到这个片刻。');
    } finally {
      if (mounted) setState(() => _busyPresetId = null);
    }
  }

  Future<void> _rename(SavedSoundscapePreset preset) async {
    final name = await _requestName(
      context,
      title: '给这个片刻换个名字',
      initialValue: preset.name,
      confirmLabel: '保存',
    );
    if (name == null || !mounted) return;
    widget.controller.renameSavedPreset(preset.id, name);
    _showSoundscapeMessage(context, '名字已保存。');
  }

  Future<void> _delete(SavedSoundscapePreset preset) async {
    final confirmed = await _confirmAction(
      context,
      title: '删除「${preset.name}」？',
      message: '这只会删除保存的片刻，不会影响声音素材或当前播放。',
      confirmLabel: '删除',
    );
    if (!confirmed || !mounted) return;
    widget.controller.deleteSavedPreset(preset.id);
    _showSoundscapeMessage(context, '这个片刻已删除。');
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final presets = widget.snapshot.savedPresets;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Expanded(child: Text('自己的片刻', style: theme.textTheme.titleMedium)),
            OutlinedButton.icon(
              key: const ValueKey('save-moment'),
              onPressed: () => unawaited(_save()),
              icon: const Icon(Icons.bookmark_add_outlined, size: 18),
              label: const Text('存下此刻'),
            ),
          ],
        ),
        const SizedBox(height: 12),
        if (presets.isEmpty)
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 24),
            child: Text(
              '满意时，把此刻的轻重、层次和声音留在这里。',
              style: theme.textTheme.bodyMedium?.copyWith(
                color: theme.textTheme.bodySmall?.color,
              ),
            ),
          )
        else
          for (var index = 0; index < presets.length; index++) ...[
            if (index > 0) Divider(height: 1, color: theme.dividerColor),
            _SavedMomentRow(
              preset: presets[index],
              busy: _busyPresetId == presets[index].id,
              onApply: () => unawaited(_apply(presets[index])),
              onRename: () => unawaited(_rename(presets[index])),
              onDelete: () => unawaited(_delete(presets[index])),
            ),
          ],
      ],
    );
  }
}

class _SavedMomentRow extends StatelessWidget {
  const _SavedMomentRow({
    required this.preset,
    required this.busy,
    required this.onApply,
    required this.onRename,
    required this.onDelete,
  });

  final SavedSoundscapePreset preset;
  final bool busy;
  final VoidCallback onApply;
  final VoidCallback onRename;
  final VoidCallback onDelete;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final sceneName = SoundscapeCatalog.scenes
        .where((scene) => scene.id == preset.sceneId)
        .map((scene) => scene.name)
        .firstOrNull;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 15),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  preset.name,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: theme.textTheme.titleMedium,
                ),
                const SizedBox(height: 3),
                Text(sceneName ?? '声景', style: theme.textTheme.bodySmall),
              ],
            ),
          ),
          const SizedBox(width: 14),
          TextButton(
            key: ValueKey('apply-preset-${preset.id}'),
            onPressed: busy ? null : onApply,
            child: busy
                ? const SizedBox.square(
                    dimension: 16,
                    child: CircularProgressIndicator(strokeWidth: 1.6),
                  )
                : const Text('回到此刻'),
          ),
          MenuAnchor(
            menuChildren: [
              MenuItemButton(
                onPressed: busy ? null : onRename,
                leadingIcon: const Icon(Icons.edit_outlined, size: 19),
                child: const Text('重命名'),
              ),
              MenuItemButton(
                onPressed: busy ? null : onDelete,
                leadingIcon: const Icon(Icons.delete_outline_rounded, size: 19),
                child: const Text('删除'),
              ),
            ],
            builder: (context, menuController, child) => IconButton(
              tooltip: '更多操作',
              onPressed: busy
                  ? null
                  : () {
                      menuController.isOpen
                          ? menuController.close()
                          : menuController.open();
                    },
              icon: const Icon(Icons.more_horiz_rounded, size: 21),
            ),
          ),
        ],
      ),
    );
  }
}

bool _matchesCategory(SoundAsset asset, _SoundLibraryCategory category) {
  final imported =
      asset.availability == SoundAssetAvailability.imported ||
      asset.category == SoundAssetCategory.custom;
  final media =
      asset.category == SoundAssetCategory.device ||
      asset.category == SoundAssetCategory.media;
  final eventOnly =
      asset.segments.isNotEmpty &&
      asset.segments.every(
        (segment) =>
            segment.purpose == SoundSegmentPurpose.event ||
            segment.purpose == SoundSegmentPurpose.bridge,
      );
  return switch (category) {
    _SoundLibraryCategory.environment => !imported && !media && !eventOnly,
    _SoundLibraryCategory.event => !imported && !media && eventOnly,
    _SoundLibraryCategory.media => !imported && media,
    _SoundLibraryCategory.mine => imported,
  };
}

String _soundCharacterLabel(SoundCharacter character) => switch (character) {
  SoundCharacter.natural => '自然',
  SoundCharacter.hifi => 'Hi-Fi',
  SoundCharacter.tube => '胆机',
  SoundCharacter.radio => '老式收音机',
  SoundCharacter.television => '雪花电视',
  SoundCharacter.speaker => '单声道喇叭',
  SoundCharacter.spatial => '耳机空间',
};

String _assetDescriptor(SoundAsset asset, ImportedSoundRecord? importedRecord) {
  if (importedRecord != null) {
    return '${importedRecord.originalFileName} · '
        '${_formatFileSize(importedRecord.byteLength)} · 仅保存在本机';
  }
  final category = switch (asset.category) {
    SoundAssetCategory.weather => '天气',
    SoundAssetCategory.water => '水声',
    SoundAssetCategory.fire => '火焰',
    SoundAssetCategory.wildlife => '生灵',
    SoundAssetCategory.place => '场所',
    SoundAssetCategory.device => '设备',
    SoundAssetCategory.media => '媒介',
    SoundAssetCategory.custom => '我的声音',
  };
  final license = asset.source.license.spdxId ?? asset.source.license.name;
  return '$category · $license';
}

String _formatFileSize(int bytes) {
  if (bytes >= 1024 * 1024) {
    return '${(bytes / (1024 * 1024)).toStringAsFixed(1)} MB';
  }
  if (bytes >= 1024) return '${(bytes / 1024).round()} KB';
  return '$bytes B';
}

Future<String?> _requestName(
  BuildContext context, {
  required String title,
  required String initialValue,
  required String confirmLabel,
}) async {
  final textController = TextEditingController(text: initialValue);
  textController.selection = TextSelection(
    baseOffset: 0,
    extentOffset: textController.text.length,
  );
  final result = await showAdaptiveDialog<String>(
    context: context,
    builder: (dialogContext) {
      void submit() {
        final value = textController.text.trim();
        if (value.isNotEmpty) Navigator.of(dialogContext).pop(value);
      }

      return AlertDialog(
        title: Text(title),
        content: TextField(
          controller: textController,
          autofocus: true,
          maxLength: 40,
          textInputAction: TextInputAction.done,
          decoration: const InputDecoration(hintText: '输入名称'),
          onSubmitted: (_) => submit(),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(),
            child: const Text('取消'),
          ),
          FilledButton(onPressed: submit, child: Text(confirmLabel)),
        ],
      );
    },
  );
  textController.dispose();
  return result;
}

Future<bool> _confirmAction(
  BuildContext context, {
  required String title,
  required String message,
  required String confirmLabel,
}) async {
  return await showAdaptiveDialog<bool>(
        context: context,
        builder: (dialogContext) => AlertDialog(
          title: Text(title),
          content: Text(message),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(dialogContext).pop(false),
              child: const Text('取消'),
            ),
            FilledButton(
              onPressed: () => Navigator.of(dialogContext).pop(true),
              child: Text(confirmLabel),
            ),
          ],
        ),
      ) ??
      false;
}

void _showSoundscapeMessage(BuildContext context, String message) {
  final messenger = ScaffoldMessenger.of(context);
  messenger
    ..hideCurrentSnackBar()
    ..showSnackBar(SnackBar(content: Text(message)));
}
