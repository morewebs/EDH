window.__ModuleLoader__.load({
  id: '@moreweb/edh',
  factory(require) {
    const React = require('react')
    const h = React.createElement

    /** Dictionary namespace owned by this plugin. */
    const NS = 'edh'
    /** Feature rows are the rows whose module lives under the package prefix. */
    const FEATURE_PREFIX = '@moreweb/edh/'
    /** The row that carries message editing; the browser half reads its enablement. */
    const EDIT_MODULE = '@moreweb/edh/edit'
    /** The row that carries Markdown export; the browser half reads its enablement. */
    const EXPORT_MODULE = '@moreweb/edh/export'
    /** The row that carries the update feature; the browser half reads its enablement. */
    const UPDATE_MODULE = '@moreweb/edh/update'
    /** This bundle's own package name: the Plugin Manager subject and the module id. */
    const PACKAGE_NAME = '@moreweb/edh'

    const en = {
      label: 'EDH',
      aria: 'EDH features',
      hintOn: 'EDH is on. Click to pause its features.',
      hintOff: 'EDH is off. Click to turn its features back on.',
      unavailable: 'EDH has no feature rows loaded.',
      failed: 'The switch could not be changed. Open Plugins to check the rows.',
      restart: 'Saved. This change applies after the next app restart.',
      copy: 'Copy',
      copied: 'Copied',
      edit: 'Edit message',
      editFailed: 'The message could not be opened for editing.',
      export: 'Export as Markdown',
      update: 'Update EDH',
      updateHint: 'Check for a published EDH update.',
      updateTo: 'Update to {version}',
      updateToHint: 'Download and apply EDH {version}. Its checkout must have no local changes.',
      checking: 'Checking…',
      checkingHint: 'Reading the published EDH version.',
      upToDate: 'Up to date',
      upToDateHint: 'EDH {version} is the published version.',
      notCheckout: 'Not a checkout',
      notCheckoutHint: 'EDH was not installed from a git checkout, so it cannot update itself here.',
      updating: 'Updating…',
      updatingHint: 'Fast-forwarding the EDH checkout.',
      updated: 'Updated',
      updatedHint: 'EDH is now {version}.',
      restartToFinish: 'Restart to finish',
      restartHint: 'EDH is now {version}. The new host half lands on restart.',
      checkFailed: 'Check failed',
      updateFailed: 'Update failed',
      offlineHint: 'No network: the published version could not be read.',
      dirtyHint: 'EDH has uncommitted changes, so nothing was changed.',
      errorHint: 'The update could not be applied. Open Plugins to check the EDH rows.',
      reload: 'Reload',
      reloading: 'Reloading…',
      reloadDone: 'Reloaded',
      reloadStale: 'Interface reloaded. Restart to load the new Host half.',
      reloadNoRevision: 'Reload failed. The Host did not offer a new revision.',
      reloadFailed: 'Reload failed. The interface could not be reloaded.',
      reloadTitle: 'Load the newest EDH interface without restarting the app.',
      mcpNav: 'MCP servers',
      mcpTitle: 'MCP servers',
      mcpIntro: 'Connect a server once and every session can use its tools.',
      mcpLoading: 'Reading servers…',
      mcpLoadFailed: 'The server list could not be read.',
      mcpRetry: 'Retry',
      mcpOff: 'MCP is off. Turn it on with the EDH switch.',
      mcpEmpty: 'No MCP servers yet. Add one to give the model its tools.',
      mcpAdd: 'Add server',
      mcpAdding: 'Adding…',
      mcpCancel: 'Cancel',
      mcpTransport: 'Transport',
      mcpBranchCommand: 'Command',
      mcpBranchUrl: 'URL',
      mcpName: 'Name',
      mcpNamePlaceholder: 'Optional name',
      mcpCommand: 'Command',
      mcpCommandPlaceholder: 'npx',
      mcpArgs: 'Arguments',
      mcpArgsPlaceholder: '-y\n@modelcontextprotocol/server-filesystem\n.',
      mcpEnv: 'Environment (optional)',
      mcpEnvPlaceholder: 'API_TOKEN=…',
      mcpUrl: 'URL',
      mcpUrlPlaceholder: 'https://example.com/mcp',
      mcpAuthorization: 'Authorization (optional)',
      mcpAuthorizationPlaceholder: 'Bearer …',
      mcpStateConnected: 'Connected',
      mcpStateStarting: 'Starting',
      mcpStateFailed: 'Failed',
      mcpStateOff: 'Off',
      mcpToolOne: '1 tool',
      mcpTools: '{count} tools',
      mcpTest: 'Test',
      mcpTesting: 'Testing…',
      mcpStart: 'Start',
      mcpStarting: 'Starting…',
      mcpStop: 'Stop',
      mcpStopping: 'Stopping…',
      mcpRemove: 'Remove',
      mcpRemoving: 'Removing…',
      mcpFailedGeneric: 'The last connection attempt failed. Test the server to see why.',
      mcpTestOne: 'Test passed: 1 tool.',
      mcpTestMany: 'Test passed: {count} tools.',
      mcpActionFailed: 'That change did not save. Retry, and check the server command or URL.',
      mcpCommandRequired: 'Enter the command that starts the server.',
      mcpUrlInvalid: 'Enter the server URL, starting with http:// or https://.',
      mcpEnvInvalid: 'Write environment lines as NAME=value, one per line.',
      mcpNotReady: 'The server is not ready. Start it, then try again.',
      mcpUnknownServer: 'That server is no longer in the list.',
    }
    const zh = {
      label: 'EDH',
      aria: 'EDH 功能开关',
      hintOn: 'EDH 已开启，点击暂停全部功能。',
      hintOff: 'EDH 已关闭，点击恢复全部功能。',
      unavailable: 'EDH 没有已装载的功能行。',
      failed: '开关未能修改，请到「插件」页查看对应行。',
      restart: '已保存，下次重启应用后生效。',
      copy: '复制',
      copied: '已复制',
      edit: '编辑消息',
      editFailed: '无法打开该消息进行编辑。',
      export: '导出为 Markdown',
      update: '更新 EDH',
      updateHint: '检查已发布的 EDH 版本。',
      updateTo: '更新到 {version}',
      updateToHint: '下载并应用 EDH {version}，检出目录需无本地改动。',
      checking: '检查中…',
      checkingHint: '正在读取已发布的 EDH 版本。',
      upToDate: '已是最新',
      upToDateHint: 'EDH {version} 就是已发布的版本。',
      notCheckout: '不是 git 检出',
      notCheckoutHint: 'EDH 不是从 git 检出安装的，无法在此自行更新。',
      updating: '更新中…',
      updatingHint: '正在快进 EDH 检出目录。',
      updated: '已更新',
      updatedHint: 'EDH 现在是 {version}。',
      restartToFinish: '重启以完成',
      restartHint: 'EDH 现在是 {version}，新的宿主部分将在重启后生效。',
      checkFailed: '检查失败',
      updateFailed: '更新失败',
      offlineHint: '无网络：无法读取已发布版本。',
      dirtyHint: 'EDH 有未提交的改动，未做任何修改。',
      errorHint: '更新未能应用，请到「插件」页查看 EDH 对应行。',
      reload: '重新载入',
      reloading: '正在重新载入…',
      reloadDone: '已重新载入',
      reloadStale: '界面已重新载入。请重启以加载新的宿主部分。',
      reloadNoRevision: '重新载入失败。宿主没有提供新的版本。',
      reloadFailed: '重新载入失败。界面无法重新载入。',
      reloadTitle: '无需重启应用即可加载最新的 EDH 界面。',
      mcpNav: 'MCP 服务器',
      mcpTitle: 'MCP 服务器',
      mcpIntro: '连接一次服务器，之后每个会话都能使用它的工具。',
      mcpLoading: '正在读取服务器…',
      mcpLoadFailed: '无法读取服务器列表。',
      mcpRetry: '重试',
      mcpOff: 'MCP 已关闭，请用 EDH 开关打开。',
      mcpEmpty: '还没有 MCP 服务器。添加一个，把它的工具交给模型。',
      mcpAdd: '添加服务器',
      mcpAdding: '正在添加…',
      mcpCancel: '取消',
      mcpTransport: '传输方式',
      mcpBranchCommand: '命令',
      mcpBranchUrl: 'URL',
      mcpName: '名称',
      mcpNamePlaceholder: '可选的名称',
      mcpCommand: '命令',
      mcpCommandPlaceholder: 'npx',
      mcpArgs: '参数',
      mcpArgsPlaceholder: '-y\n@modelcontextprotocol/server-filesystem\n.',
      mcpEnv: '环境变量（可选）',
      mcpEnvPlaceholder: 'API_TOKEN=…',
      mcpUrl: 'URL',
      mcpUrlPlaceholder: 'https://example.com/mcp',
      mcpAuthorization: 'Authorization（可选）',
      mcpAuthorizationPlaceholder: 'Bearer …',
      mcpStateConnected: '已连接',
      mcpStateStarting: '正在启动',
      mcpStateFailed: '失败',
      mcpStateOff: '已关闭',
      mcpToolOne: '1 个工具',
      mcpTools: '{count} 个工具',
      mcpTest: '测试',
      mcpTesting: '正在测试…',
      mcpStart: '启动',
      mcpStarting: '正在启动…',
      mcpStop: '停止',
      mcpStopping: '正在停止…',
      mcpRemove: '移除',
      mcpRemoving: '正在移除…',
      mcpFailedGeneric: '上次连接失败。测试服务器可查看原因。',
      mcpTestOne: '测试通过：1 个工具。',
      mcpTestMany: '测试通过：{count} 个工具。',
      mcpActionFailed: '改动未保存。请重试，并检查服务器命令或 URL。',
      mcpCommandRequired: '请填写启动该服务器的命令。',
      mcpUrlInvalid: '请填写以 http:// 或 https:// 开头的服务器 URL。',
      mcpEnvInvalid: '环境变量每行写成 NAME=value。',
      mcpNotReady: '服务器尚未就绪，请先启动再试。',
      mcpUnknownServer: '该服务器已不在列表中。',
    }

    /**
     * The rows EDH owns besides its shell: anything under `@moreweb/edh/…`.
     * @param entries - the Plugin Manager's plugin list.
     * @returns the feature rows, in list order.
     */
    function findFeatures(entries) {
      const list = Array.isArray(entries) ? entries : []
      return list.filter(entry => entry !== null && typeof entry === 'object'
        && typeof entry.moduleName === 'string'
        && entry.moduleName.startsWith(FEATURE_PREFIX)
        && typeof entry.entryId === 'string')
    }

    /** Accept either the RemoteResult wrapper or the raw value. */
    function unwrap(result) {
      if (result !== null && typeof result === 'object' && typeof result.ok === 'boolean') {
        return result.ok ? { ok: true, value: result.value } : { ok: false, value: undefined }
      }
      return { ok: true, value: result }
    }

    /**
     * Last-state breadcrumb: the page keeps the latest read, mount box, and last
     * write result under one Local Storage key. It is diagnostic only — a refused
     * write never affects the switch.
     */
    const DEBUG_KEY = 'edh:debug'
    /** Separate breadcrumb for message editing, so the switch trace stays readable. */
    const EDIT_DEBUG_KEY = 'edh:edit'
    /** Separate breadcrumb for Markdown export. */
    const EXPORT_DEBUG_KEY = 'edh:export'
    /** Separate breadcrumb for the update action. */
    const UPDATE_DEBUG_KEY = 'edh:update'
    /** Separate breadcrumb for the MCP server page. */
    const MCP_DEBUG_KEY = 'edh:mcp'

    function writeBreadcrumb(key, payload) {
      try {
        window.localStorage.setItem(key, JSON.stringify({ at: Date.now(), ...payload }))
      } catch (error) {
        // A storage refusal must never break a feature.
      }
    }

    function debugWrite(payload) {
      writeBreadcrumb(DEBUG_KEY, payload)
    }

    function editWrite(payload) {
      writeBreadcrumb(EDIT_DEBUG_KEY, payload)
    }

    function exportWrite(payload) {
      writeBreadcrumb(EXPORT_DEBUG_KEY, payload)
    }

    function updateWrite(payload) {
      writeBreadcrumb(UPDATE_DEBUG_KEY, payload)
    }

    function mcpWrite(payload) {
      writeBreadcrumb(MCP_DEBUG_KEY, payload)
    }

    /** One error's text, whatever was thrown. */
    function messageOf(error) {
      return String(error?.message ?? error)
    }

    /**
     * The switch's state machine: read the feature rows, write their enablement,
     * and publish pending / failed / restart notes to subscribers.
     * @param remote - the `remote.pluginManager` namespace.
     */
    function createController(remote) {
      const state = { status: 'loading', enabled: false, pending: false, note: '', features: 0, moduleStates: {} }
      const listeners = new Set()
      /** Entry ids of the feature rows read by the last successful refresh. */
      let featureRows = []

      const publish = patch => {
        Object.assign(state, patch)
        for (const listener of [...listeners]) listener()
      }

      const subscribe = listener => {
        listeners.add(listener)
        return () => listeners.delete(listener)
      }

      const refresh = async () => {
        let result
        try {
          result = await remote.listPlugins()
        } catch (error) {
          console.error('[edh] plugin list read failed:', error)
          debugWrite({ phase: 'list-threw', message: String(error?.message ?? error) })
          publish({ status: 'error', pending: false })
          return
        }
        const read = unwrap(result)
        if (!read.ok) {
          debugWrite({ phase: 'list-refused' })
          publish({ status: 'error', pending: false })
          return
        }
        const features = findFeatures(read.value)
        featureRows = features.map(feature => feature.entryId)
        const enabled = features.length > 0 && features.every(feature => feature.enabled === true)
        /** Per-row enablement, so one feature can gate its own UI independently. */
        const moduleStates = {}
        for (const feature of features) moduleStates[feature.moduleName] = feature.enabled === true
        debugWrite({
          phase: features.length === 0 ? 'no-features' : 'features',
          count: features.length,
          enabled,
          moduleNames: features.map(feature => feature.moduleName),
        })
        if (features.length === 0) {
          publish({ status: 'unavailable', pending: false, enabled: false, features: 0, moduleStates })
          return
        }
        publish({ status: 'ready', enabled, pending: false, features: features.length, moduleStates })
      }

      const toggle = async () => {
        if (state.pending || state.status !== 'ready' || featureRows.length === 0) return
        const next = !state.enabled
        publish({ pending: true, note: '' })
        const applications = []
        for (const entryId of featureRows) {
          let result
          try {
            result = await remote.setPluginEnabled(entryId, next)
          } catch (error) {
            console.error('[edh] feature enablement write failed:', error)
            debugWrite({ phase: 'write-threw', entryId, message: String(error?.message ?? error), next })
            publish({ pending: false, note: 'failed' })
            await refresh()
            return
          }
          const change = unwrap(result)
          if (!change.ok) {
            debugWrite({ phase: 'write-refused', entryId, next })
            publish({ pending: false, note: 'failed' })
            await refresh()
            return
          }
          applications.push(change.value?.application)
        }
        debugWrite({ phase: 'write-result', next, applications })
        if (applications.every(application => application === 'applied')) {
          publish({ pending: false, enabled: next })
        } else if (applications.some(application => application === 'restart-required')) {
          publish({ pending: false, enabled: next, note: 'restart' })
        } else {
          publish({ pending: false, note: 'failed' })
        }
        await refresh()
      }

      return {
        getSnapshot: () => state,
        subscribe,
        refresh,
        toggle,
      }
    }

    /**
     * Whether one feature row is loaded and enabled right now.
     *
     * A profile whose bundle patch predates a row (an upgrade that has not been
     * restarted yet) simply has no entry for it; that case follows the aggregate
     * instead of silently switching the feature off. A feature that needs its
     * own Host half cannot use that fallback — see `rowEnabled`.
     *
     * Kept pure so the Node test can exercise it without a browser.
     * @param snapshot - a `createController` snapshot.
     * @param moduleName - the row's module name, e.g. `@moreweb/edh/edit`.
     */
    function featureEnabled(snapshot, moduleName) {
      if (snapshot === null || typeof snapshot !== 'object') return false
      if (snapshot.status !== 'ready') return false
      const states = snapshot.moduleStates
      if (states === null || typeof states !== 'object') return false
      if (Object.prototype.hasOwnProperty.call(states, moduleName)) return states[moduleName] === true
      return snapshot.enabled === true
    }

    /**
     * Whether one feature row is *present and* enabled — no aggregate fallback.
     *
     * For a feature whose UI is useless without its Host half: before the
     * restart that mounts a new row, the button would otherwise appear in front
     * of a route that does not exist yet.
     * @param snapshot - a `createController` snapshot.
     * @param moduleName - the row's module name.
     */
    function rowEnabled(snapshot, moduleName) {
      if (snapshot === null || typeof snapshot !== 'object') return false
      if (snapshot.status !== 'ready') return false
      const states = snapshot.moduleStates
      if (states === null || typeof states !== 'object') return false
      return states[moduleName] === true
    }

    /**
     * One hook per feature row: true while that row is loaded and enabled.
     * @param controller - the switch controller holding the row states.
     * @param moduleName - the row's module name, e.g. `@moreweb/edh/export`.
     * @param isEnabled - the enablement rule; `rowEnabled` when the row's own
     *   presence matters, `featureEnabled` when the aggregate may stand in.
     */
    function createFeatureHook(controller, moduleName, isEnabled = featureEnabled) {
      return function useFeatureEnabled() {
        const [enabled, setEnabled] = React.useState(() => isEnabled(controller.getSnapshot(), moduleName))
        React.useEffect(() => {
          const sync = () => {
            const next = isEnabled(controller.getSnapshot(), moduleName)
            setEnabled(previous => (previous === next ? previous : next))
          }
          sync()
          return controller.subscribe(sync)
        }, [])
        return enabled
      }
    }

    /** Build the switch component over one controller and its translator. */
    function createSwitch(t, controller) {
      return function EdhSwitch() {
        const [snapshot, setSnapshot] = React.useState(() => ({ ...controller.getSnapshot() }))
        const [hover, setHover] = React.useState(false)
        const ref = React.useRef(null)
        React.useEffect(() => {
          const sync = () => setSnapshot({ ...controller.getSnapshot() })
          sync()
          return controller.subscribe(sync)
        }, [])
        React.useEffect(() => {
          const element = ref.current
          if (element !== null) {
            const rect = element.getBoundingClientRect()
            debugWrite({
              phase: 'mounted',
              status: controller.getSnapshot().status,
              box: {
                x: Math.round(rect.x),
                y: Math.round(rect.y),
                width: Math.round(rect.width),
                height: Math.round(rect.height),
              },
            })
          }
        }, [])

        const ready = snapshot.status === 'ready'
        const enabled = snapshot.enabled === true
        const busy = snapshot.pending || !ready
        const title = snapshot.note !== ''
          ? t(snapshot.note)
          : snapshot.status === 'unavailable'
            ? t('unavailable')
            : ready ? (enabled ? t('hintOn') : t('hintOff')) : snapshot.status === 'error' ? t('failed') : t('label')

        return h('button', {
          ref,
          type: 'button',
          role: 'switch',
          'aria-checked': enabled,
          'aria-label': t('aria'),
          'aria-busy': snapshot.pending || undefined,
          title,
          disabled: busy,
          onClick: () => {
            void controller.toggle()
          },
          onMouseEnter: () => setHover(true),
          onMouseLeave: () => setHover(false),
          style: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            height: '24px',
            padding: '0 8px',
            border: 'none',
            borderRadius: '6px',
            background: hover && !busy ? 'var(--dsw-alias-bg-layer-1)' : 'transparent',
            color: enabled ? 'var(--dsw-alias-label-primary)' : 'var(--dsw-alias-label-secondary)',
            font: 'inherit',
            fontSize: '12px',
            lineHeight: '16px',
            whiteSpace: 'nowrap',
            cursor: busy ? 'default' : 'pointer',
            opacity: ready ? 1 : 0.55,
            flexShrink: 0,
            userSelect: 'none',
            transition: 'background 120ms ease, color 120ms ease, opacity 120ms ease',
          },
        },
          h('span', null, t('label')),
          h('span', {
            'aria-hidden': true,
            style: {
              position: 'relative',
              display: 'inline-block',
              boxSizing: 'border-box',
              width: '22px',
              height: '12px',
              borderRadius: '999px',
              background: enabled ? 'var(--dsw-alias-brand-primary)' : 'var(--dsw-alias-bg-layer-2)',
              border: enabled ? '1px solid transparent' : '1px solid var(--dsw-alias-border-l1)',
              flexShrink: 0,
              transition: 'background 120ms ease',
            },
          },
            h('span', {
              style: {
                position: 'absolute',
                top: '1px',
                left: enabled ? '11px' : '1px',
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: enabled ? 'var(--dsw-alias-bg-base)' : 'var(--dsw-alias-label-secondary)',
                transition: 'left 120ms ease',
              },
            }),
          ),
        )
      }
    }

    // ---------------------------------------------------------------------
    // Message editing
    //
    // The Session log is append-only, so there is no in-place rewrite. Editing
    // a message therefore means: fork the Session immediately before that
    // message, then hand the text back to the composer of the fork. The
    // original conversation is preserved, and the user edits and resends in the
    // real composer.
    // ---------------------------------------------------------------------

    /**
     * Split one user message body the way the shipped bubble does.
     * @param content - the message content blocks.
     * @returns joined text, attachment entries, and the remaining blocks.
     */
    function contentParts(content) {
      const texts = []
      const attachments = []
      const rest = []
      const blocks = Array.isArray(content) ? content : []
      for (const block of blocks) {
        const b = block
        if (b === null || typeof b !== 'object') continue
        if (b.type === 'text' && typeof b.text === 'string') texts.push(b.text)
        else if (b.type === 'image' && b.attachment !== undefined) attachments.push({ type: 'image', image: { attachment: b.attachment } })
        else if (b.type === 'file' && b.attachment !== undefined) attachments.push({ type: 'file', file: b.attachment })
        else rest.push(block)
      }
      return { text: texts.join(''), attachments, rest }
    }

    /** Copies of the shipped 16px outline glyphs, so the row matches its neighbours. */
    function glyph(children) {
      return h('svg', {
        width: 16,
        height: 16,
        viewBox: '0 0 16 16',
        fill: 'none',
        xmlns: 'http://www.w3.org/2000/svg',
        'aria-hidden': 'true',
        strokeWidth: 1,
      }, children)
    }

    function EditIcon() {
      return glyph([
        h('path', {
          key: 'body',
          d: 'M8.85596 2.69971H4.19971C3.37141 2.69971 2.69992 3.37146 2.69971 4.19971V11.8003C2.69992 12.6285 3.37141 13.3003 4.19971 13.3003H11.8003C12.6283 13.2999 13.3001 12.6283 13.3003 11.8003V7.89893H14.3003V11.8003C14.3001 13.1806 13.1806 14.2999 11.8003 14.3003H4.19971C2.81913 14.3003 1.69992 13.1808 1.69971 11.8003V4.19971C1.69992 2.81918 2.81913 1.69971 4.19971 1.69971H8.85596V2.69971Z',
          fill: 'currentColor',
        }),
        h('path', { key: 'pen', d: 'M7.7849 8.23878L13.888 2.13574', stroke: 'currentColor' }),
      ])
    }

    function CopyIcon() {
      return glyph([
        h('rect', {
          key: 'sheet',
          x: '1.52075',
          y: '4.07373',
          width: '10.3932',
          height: '10.3932',
          rx: '2',
          stroke: 'currentColor',
        }),
        h('path', {
          key: 'back',
          d: 'M11.9792 1.53296C13.36 1.53296 14.4792 2.65225 14.4792 4.03296V9.42847C14.4792 10.3756 13.9521 11.1987 13.1755 11.6228V10.3298C13.3652 10.0787 13.4792 9.7674 13.4792 9.42847V4.03296C13.4792 3.20453 12.8077 2.53296 11.9792 2.53296H6.58374C6.27966 2.53301 5.99684 2.6235 5.7605 2.77905H4.42358C4.85652 2.03463 5.66056 1.53304 6.58374 1.53296H11.9792Z',
          fill: 'currentColor',
        }),
      ])
    }

    function CheckIcon() {
      return glyph(h('path', {
        d: 'M2.25 8.5L5.49732 11.7473C5.90519 12.1552 6.57263 12.1344 6.95426 11.7018L13.75 4',
        stroke: 'currentColor',
      }))
    }

    /** The shipped 16px download glyph. */
    function DownloadIcon() {
      return glyph([
        h('path', { key: 'shaft', d: 'M8 1.95317V10.0469', stroke: 'currentColor' }),
        h('path', { key: 'head', d: 'M4.25 6.29688L8 10.0469L11.75 6.29688', stroke: 'currentColor' }),
        h('path', {
          key: 'tray',
          d: 'M1.5 10.0469V13.158C1.5 13.3937 1.60536 13.6198 1.79289 13.7865C1.98043 13.9532 2.23478 14.0469 2.5 14.0469H13.5C13.7652 14.0469 14.0196 13.9532 14.2071 13.7865C14.3946 13.6198 14.5 13.3937 14.5 13.158V10.0469',
          stroke: 'currentColor',
        }),
      ])
    }

    const CLOCK_TIME = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' })
    const CLOCK_DATE = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })

    function startOfLocalDay(milliseconds) {
      const date = new Date(milliseconds)
      return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
    }

    /** Message clock: time of day for today, dated otherwise. */
    function formatClock(time) {
      if (typeof time !== 'number' || !Number.isFinite(time)) return ''
      return startOfLocalDay(time) === startOfLocalDay(Date.now())
        ? CLOCK_TIME.format(new Date(time))
        : CLOCK_DATE.format(new Date(time))
    }

    /** Clipboard write with the legacy selection fallback. */
    async function copyText(text) {
      try {
        const clipboard = navigator.clipboard
        if (clipboard !== undefined && typeof clipboard.writeText === 'function') {
          await clipboard.writeText(text)
          return true
        }
      } catch (error) {
        // Fall through to the selection-based path.
      }
      try {
        const area = document.createElement('textarea')
        area.value = text
        area.setAttribute('readonly', '')
        area.style.position = 'fixed'
        area.style.top = '-1000px'
        area.style.opacity = '0'
        document.body.appendChild(area)
        area.select()
        const copied = document.execCommand('copy')
        document.body.removeChild(area)
        return copied === true
      } catch (error) {
        return false
      }
    }

    /**
     * Hand-off from the message the user clicked to the composer of the fork.
     * Filled before the fork opens, drained by the Session it belongs to.
     */
    const pendingDrafts = new Map()
    /** A hand-off older than this is stale and dropped instead of replayed. */
    const PENDING_TTL_MS = 60_000

    function rememberDraft(sessionId, text) {
      const now = Date.now()
      for (const [key, entry] of pendingDrafts) {
        if (now - entry.at > PENDING_TTL_MS) pendingDrafts.delete(key)
      }
      pendingDrafts.set(sessionId, { text, at: now })
    }

    /**
     * Fork the Session just before `seq` and open the fork.
     * @param ctx - the browser plugin context.
     * @param sessionId - the Session the edited message belongs to.
     * @param seq - the edited message's own event sequence number.
     * @param text - the message body to place in the fork's composer.
     */
    async function requestEdit(ctx, sessionId, seq, text) {
      editWrite({ phase: 'click', sessionId, seq, length: text.length })
      let childId
      try {
        childId = await ctx.sessions.fork({ sessionId, atSeq: seq - 1, increaseTitle: true })
      } catch (error) {
        editWrite({ phase: 'fork-failed', sessionId, seq, message: String(error?.message ?? error) })
        return undefined
      }
      if (typeof childId !== 'string' || childId === '') {
        editWrite({ phase: 'fork-empty', sessionId, seq, childId: String(childId) })
        return undefined
      }
      rememberDraft(childId, text)
      editWrite({ phase: 'forked', sessionId, seq, childId })
      try {
        ctx.uiWorkspace.openSession(childId)
      } catch (error) {
        editWrite({ phase: 'open-failed', childId, message: String(error?.message ?? error) })
      }
      return childId
    }

    /**
     * One icon button in the message action row.
     * @param props - accessible label, click handler, and glyph.
     */
    function IconAction({ label, onClick, disabled = false, children }) {
      return h('button', {
        type: 'button',
        className: 'edh-action',
        'aria-label': label,
        title: label,
        'data-unavailable': disabled || undefined,
        onClick: disabled ? undefined : onClick,
      }, children)
    }

    /** The message action row: clock, copy, and — when the feature is on — edit. */
    function MessageActions({ text, time, t, canEdit, onEdit }) {
      const [copied, setCopied] = React.useState(false)
      const timer = React.useRef(null)
      React.useEffect(() => () => {
        if (timer.current !== null) clearTimeout(timer.current)
      }, [])
      const onCopy = React.useCallback(() => {
        if (copied) return
        void copyText(text).then(ok => {
          if (!ok) return
          setCopied(true)
          timer.current = window.setTimeout(() => {
            timer.current = null
            setCopied(false)
          }, 1e3)
        })
      }, [copied, text])
      const clock = time === undefined ? null : h('span', { className: 'edh-timeStart' }, formatClock(time))
      return h('div', { className: 'edh-actions', 'data-clock': 'start' },
        clock,
        h(IconAction, { label: copied ? t('copied') : t('copy'), onClick: onCopy }, copied ? h(CheckIcon) : h(CopyIcon)),
        canEdit ? h(IconAction, { label: t('edit'), onClick: onEdit }, h(EditIcon)) : null,
      )
    }

    /**
     * Replacement for the shipped `user` Chat renderer.
     *
     * The bubble itself still comes from the shipped `conversation.chat.user.content`
     * Factory, so only the action row is ours: the shipped one has no seam that a
     * plugin can extend on a user row.
     */
    function createUserMessageView(t, controller, ctx) {
      /** One-shot probe so a failed shadow is diagnosable without browser control. */
      let reported = false

      const useEditEnabled = createFeatureHook(controller, EDIT_MODULE)

      return React.memo(function EdhUserMessageNodeView({ node, renderFactorySlot, loadImage, sessionId }) {
        const data = node?.data ?? {}
        const editEnabled = useEditEnabled()
        const [busy, setBusy] = React.useState(false)

        // Report once that this renderer is the one painting, and whether the
        // props it needs actually arrived.
        React.useEffect(() => {
          if (reported) return
          reported = true
          editWrite({
            phase: 'view-mounted',
            sessionId: typeof sessionId === 'string' && sessionId !== '',
            factory: typeof renderFactorySlot === 'function',
            seq: typeof data.seq === 'number',
            editEnabled,
          })
        }, [])

        // A row without a Session id cannot fork; leave a trace so the reason is
        // visible instead of an Edit action that silently never appears.
        React.useEffect(() => {
          if (typeof sessionId !== 'string' || sessionId === '') {
            editWrite({ phase: 'no-session-id', nodeKey: String(node?.key ?? '') })
          }
        }, [sessionId, node])

        const parts = React.useMemo(() => contentParts(data.content), [data.content])
        const prepared = React.useMemo(() => ({
          text: parts.text,
          attachments: parts.attachments,
          extraBlocks: parts.rest,
          ...(data.referenceLabels === undefined ? {} : { referenceLabels: data.referenceLabels }),
        }), [parts, data.referenceLabels])
        const facts = React.useMemo(() => ({
          ...(data.referenceLabels === undefined ? {} : { sessionLabels: data.referenceLabels }),
          ...(data.skillNames === undefined ? {} : { skillNames: data.skillNames }),
        }), [data.referenceLabels, data.skillNames])

        const body = typeof renderFactorySlot === 'function'
          ? renderFactorySlot('conversation.chat.user.content', {
            content: prepared,
            loadImage,
            facts,
            interactive: true,
          })
          : h('div', { className: 'edh-bubble' }, prepared.text)

        const seq = data.seq
        const canEdit = editEnabled
          && !busy
          && typeof seq === 'number'
          && Number.isFinite(seq)
          && seq > 0
          && typeof sessionId === 'string'
          && sessionId !== ''

        const onEdit = React.useCallback(() => {
          if (!canEdit) return
          setBusy(true)
          void requestEdit(ctx, sessionId, seq, parts.text).finally(() => setBusy(false))
        }, [canEdit, sessionId, seq, parts.text])

        return h('div', { className: 'edh-userRow' },
          body,
          h(MessageActions, { text: parts.text, time: data.time, t, canEdit, onEdit }),
        )
      })
    }

    /**
     * Drains the hand-off for the Session it belongs to and seeds the composer.
     *
     * The composer publishes its own draft on bind, so the seed is re-applied on
     * the next frame and once more shortly after; each attempt is idempotent.
     */
    function PendingEditConsumer({ sessionId, session, inputActions }) {
      const actions = React.useRef(inputActions)
      actions.current = inputActions
      const resolved = typeof sessionId === 'string' && sessionId !== ''
        ? sessionId
        : (typeof session?.sessionId === 'string' ? session.sessionId : undefined)

      React.useEffect(() => {
        if (resolved === undefined) return
        const handoff = pendingDrafts.get(resolved)
        if (handoff === undefined) return
        if (Date.now() - handoff.at > PENDING_TTL_MS) {
          pendingDrafts.delete(resolved)
          return
        }
        // Consume only on a successful write, so a composer that mounts a beat
        // late still gets the text on one of the retries below.
        const apply = () => {
          const target = actions.current
          if (target === undefined || typeof target.setDraft !== 'function') return
          if (!pendingDrafts.has(resolved)) return
          target.setDraft(handoff.text)
          pendingDrafts.delete(resolved)
          editWrite({ phase: 'draft-applied', sessionId: resolved, length: handoff.text.length })
        }
        apply()
        const frame = window.requestAnimationFrame(apply)
        const timer = window.setTimeout(apply, 120)
        return () => {
          window.cancelAnimationFrame(frame)
          clearTimeout(timer)
        }
      }, [resolved])

      return null
    }

    /**
     * The rewritten user row. Class names are ours, but every rule and token is
     * copied from the shipped MessageItem / MessageIconActions modules so the row
     * keeps its place in the hover reveal and its exact metrics.
     */
    const EDIT_CSS = [
      '.edh-userRow{flex-direction:column;align-items:flex-end;gap:6px;display:flex}',
      '.edh-actions{height:calc(28px + var(--dsh-content-font-delta,0px));align-items:center;gap:8px;display:flex}',
      '.edh-timeStart{font-size:var(--dsh-content-font-size-secondary,13px);line-height:calc(24px + var(--dsh-content-font-delta,0px));color:var(--dsw-alias-label-tertiary);white-space:nowrap;padding-right:12px}',
      '@media (hover:hover){',
      ':is([data-chat-flow-kind=user],[data-chat-flow-kind=steering]):has(~:is([data-chat-flow-kind=user],[data-chat-flow-kind=steering])) .edh-actions{opacity:0;transition:opacity 80ms}',
      ':is([data-chat-flow-kind=user],[data-chat-flow-kind=steering]):has(~:is([data-chat-flow-kind=user],[data-chat-flow-kind=steering])):hover .edh-actions,',
      ':is([data-chat-flow-kind=user],[data-chat-flow-kind=steering]):has(~:is([data-chat-flow-kind=user],[data-chat-flow-kind=steering])):focus-within .edh-actions{opacity:1}',
      '}',
      '.edh-action{width:calc(28px + var(--dsh-content-font-delta,0px));height:calc(28px + var(--dsh-content-font-delta,0px));border-radius:var(--dsw-radius-sm);color:var(--dsw-alias-label-tertiary);cursor:pointer;background:0 0;border:none;justify-content:center;align-items:center;padding:6px;display:inline-flex}',
      '.edh-action svg{width:calc(15px + var(--dsh-content-font-delta,0px));height:calc(15px + var(--dsh-content-font-delta,0px))}',
      '.edh-action:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-secondary)}',
      '.edh-action[data-unavailable]{cursor:default;opacity:.4}',
      '.edh-action[data-unavailable]:hover{color:var(--dsw-alias-label-tertiary);background:0 0}',
      '.edh-bubble{background:var(--dsw-specific-bubble);border-radius:var(--dsw-radius-xl);max-width:100%;font-size:var(--dsh-content-font-size,14px);line-height:calc(22px + var(--dsh-content-font-delta,0px));color:var(--dsw-alias-label-primary);white-space:pre-wrap;word-break:break-word;padding:10px 16px}',
    ].join('')

    /** Install the row stylesheet once and take it back out on dispose. */
    function installEditStyles() {
      if (typeof document === 'undefined') return () => {}
      const selector = 'style[data-edh-css="edit"]'
      if (document.querySelector(selector) === null) {
        const tag = document.createElement('style')
        tag.dataset.edhCss = 'edit'
        tag.dataset.plugin = '@moreweb/edh'
        tag.textContent = EDIT_CSS
        document.head.appendChild(tag)
        return () => {
          if (tag.parentNode !== null) tag.parentNode.removeChild(tag)
        }
      }
      return () => {
        const existing = document.querySelector(selector)
        if (existing !== null && existing.parentNode !== null) existing.parentNode.removeChild(existing)
      }
    }

    // ---------------------------------------------------------------------
    // Session export
    //
    // The document itself is built on the Host, which is the only place the
    // Session log can be read in full. The browser's job is to know the Session
    // it is looking at and hand the Host's download route to its own download
    // manager — the same hand-off the shipped Session-log export makes.
    // ---------------------------------------------------------------------

    /**
     * The Host route that answers one Session's Markdown document, in the
     * document-relative form the browser resolves against its own base — the
     * same hand-off the shipped Session-log export makes.
     */
    const EXPORT_ROUTE = 'api/edh.export'

    /**
     * Collapse a Session id into one filename segment. `export.js` owns the
     * same rule for the `content-disposition` header; the two must agree, and
     * `test/export.mjs` pins the shape.
     */
    function exportFilename(sessionId) {
      return `dsh-session-${String(sessionId).replace(/[^A-Za-z0-9_-]/gu, '_')}.md`
    }

    /**
     * Hand a document-relative Host route to the browser's download manager,
     * which resolves it against the document's own base.
     * @param url - document-relative route.
     * @param filename - browser download filename.
     */
    function downloadUrl(url, filename) {
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = filename
      anchor.click()
    }

    /**
     * The Session-header action that downloads the Session as Markdown.
     *
     * It reads the `export` row's enablement, so the master switch governs it
     * like every other EDH feature, and it disappears when no Session is open.
     */
    function createExportButton(t, controller) {
      // The button is pointless without the Host route its row mounts, so the
      // aggregate fallback is not good enough here.
      const useExportEnabled = createFeatureHook(controller, EXPORT_MODULE, rowEnabled)

      return function EdhExportButton({ sessionId }) {
        const enabled = useExportEnabled()
        const [hover, setHover] = React.useState(false)
        const available = enabled && typeof sessionId === 'string' && sessionId !== ''

        React.useEffect(() => {
          if (available) exportWrite({ phase: 'mounted', sessionId })
        }, [available, sessionId])

        if (!available) return null

        return h('button', {
          type: 'button',
          'aria-label': t('export'),
          title: t('export'),
          onClick: () => {
            const url = `${EXPORT_ROUTE}?${new URLSearchParams({ sessionId }).toString()}`
            exportWrite({ phase: 'click', sessionId, url })
            try {
              downloadUrl(url, exportFilename(sessionId))
            } catch (error) {
              exportWrite({ phase: 'failed', sessionId, message: String(error?.message ?? error) })
            }
          },
          onMouseEnter: () => setHover(true),
          onMouseLeave: () => setHover(false),
          style: {
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '24px',
            height: '24px',
            padding: 0,
            border: 'none',
            borderRadius: '6px',
            background: hover ? 'var(--dsw-alias-bg-layer-1)' : 'transparent',
            color: 'var(--dsw-alias-label-secondary)',
            cursor: 'pointer',
            flexShrink: 0,
            transition: 'background 120ms ease, color 120ms ease',
          },
        }, h(DownloadIcon))
      }
    }

    // ---------------------------------------------------------------------
    // Updating EDH
    //
    // The Host half owns the routes that read the published version and
    // fast-forward the checkout. The browser's job is the one control, in Plugin
    // Manager on EDH's own page, and the last step of an applied update: handing
    // this bundle's module to the client module system so the *new* browser half
    // runs without a page reload.
    // ---------------------------------------------------------------------

    /**
     * The Host route that answers one check (`GET`) and one apply (`POST`), in the
     * document-relative form the browser resolves against its own base.
     */
    const UPDATE_ROUTE = 'api/edh.update'

    /** Document-relative route the Host publishes graph and `rebuilt` frames on. */
    const EVENTS_ROUTE = 'plugins/events'

    /** How long the page waits for the Host to publish a new bundle revision. */
    const REVISION_TIMEOUT_MS = 8000

    /** A control that has not checked yet: it offers the check and nothing more. */
    const IDLE_UPDATE = Object.freeze({
      status: 'idle',
      stage: '',
      installed: '',
      latest: '',
      from: '',
      to: '',
      reason: '',
    })

    /**
     * Which Plugin Manager detail page a subject is, when it is EDH's own.
     *
     * The shipped page builds three subjects: `item` for an official catalog
     * entry, `row` for one configuration row, and `bundle` for one installed
     * package. Only the last two carry a package at all, and `subject.pkg.name`
     * is the bundle's own package name — the one field that identifies EDH
     * without guessing at a title, a row id, or a version.
     * @param subject - the page's subject prop.
     * @returns `bundle` or `row` for an EDH page, `undefined` for any other.
     */
    function updateSubject(subject) {
      if (subject === null || typeof subject !== 'object') return undefined
      const pkg = subject.pkg
      if (pkg === null || typeof pkg !== 'object' || pkg.name !== PACKAGE_NAME) return undefined
      return subject.kind === 'bundle' || subject.kind === 'row' ? subject.kind : undefined
    }

    /**
     * The state one check answer describes.
     * @param payload - the route's parsed answer.
     * @returns up to date, an update to offer, or why the check could not run.
     */
    function readCheck(payload) {
      const answer = payload !== null && typeof payload === 'object' ? payload : {}
      const installed = typeof answer.installed === 'string' ? answer.installed : ''
      const latest = typeof answer.latest === 'string' ? answer.latest : ''
      if (answer.ok !== true) {
        const reason = typeof answer.reason === 'string' ? answer.reason : 'error'
        return {
          status: reason === 'no-checkout' ? 'not-a-checkout' : 'failed',
          stage: 'check',
          installed,
          latest,
          from: '',
          to: '',
          reason,
        }
      }
      return {
        status: answer.available === true && latest !== '' ? 'update-available' : 'up-to-date',
        stage: 'check',
        installed,
        latest,
        from: '',
        to: '',
        reason: '',
      }
    }

    /**
     * The state one apply answer describes. Only an explicit `requiresRestart:
     * false` means the Host half was re-read in place; anything else says so
     * rather than offering a reload that would only load a second browser half.
     * @param payload - the route's parsed answer.
     */
    function readApply(payload) {
      const answer = payload !== null && typeof payload === 'object' ? payload : {}
      const from = typeof answer.from === 'string' ? answer.from : ''
      const to = typeof answer.to === 'string' ? answer.to : ''
      if (answer.ok !== true) {
        const reason = typeof answer.reason === 'string' ? answer.reason : 'error'
        return { status: 'failed', stage: 'apply', installed: from, latest: to, from, to, reason }
      }
      return {
        status: answer.requiresRestart === false ? 'updated-live' : 'updated-needs-restart',
        stage: 'apply',
        installed: to,
        latest: to,
        from,
        to,
        reason: '',
      }
    }

    /**
     * The tooltip for one refusal reason, in the words the routes answer with.
     * @param reason - `no-checkout`, `dirty`, `offline`, `error`, or anything else.
     * @returns the dictionary key of the sentence to show.
     */
    function failureNote(reason) {
      switch (reason) {
        case 'no-checkout': return 'notCheckoutHint'
        case 'dirty': return 'dirtyHint'
        case 'offline': return 'offlineHint'
        default: return 'errorHint'
      }
    }

    /**
     * The label and tooltip one update state offers.
     *
     * Kept pure so the Node test can pin the copy the control actually shows
     * instead of reading it back out of a rendered element.
     * @param state - the control's current state.
     * @param t - the dictionary's translate function.
     * @returns the visible label and the tooltip sentence.
     */
    function updateText(state, t) {
      const status = state !== null && typeof state === 'object' ? state.status : undefined
      const latest = typeof state?.latest === 'string' && state.latest !== '' ? state.latest : '?'
      switch (status) {
        case 'checking':
          return { label: t('checking'), title: t('checkingHint') }
        case 'update-available':
          return { label: t('updateTo', { version: latest }), title: t('updateToHint', { version: latest }) }
        case 'up-to-date':
          return { label: t('upToDate'), title: t('upToDateHint', { version: latest }) }
        case 'not-a-checkout':
          return { label: t('notCheckout'), title: t(failureNote('no-checkout')) }
        case 'updating':
          return { label: t('updating'), title: t('updatingHint') }
        case 'updated-live':
          return { label: t('updated'), title: t('updatedHint', { version: latest }) }
        case 'updated-needs-restart':
          return { label: t('restartToFinish'), title: t('restartHint', { version: latest }) }
        case 'failed':
          return {
            label: t(state.stage === 'apply' ? 'updateFailed' : 'checkFailed'),
            title: t(failureNote(state.reason)),
          }
        default:
          return { label: t('update'), title: t('updateHint') }
      }
    }

    /**
     * The revision one event frame reports for a module, when it is new.
     *
     * A `rebuilt` frame names the single module the Host just re-read; a `graph`
     * frame carries every row, which is how the page learns a revision a missed
     * rebuild frame already published.
     * @param text - one frame's `data` payload.
     * @param moduleId - the module to find.
     * @param previous - the revision the page is already running.
     * @returns the new revision, or `undefined` when the frame names none.
     */
    function revisionOfFrame(text, moduleId, previous) {
      let frame
      try {
        frame = JSON.parse(text)
      } catch (error) {
        return undefined
      }
      if (frame === null || typeof frame !== 'object') return undefined
      if (frame.type === 'rebuilt') {
        if (frame.id !== moduleId || typeof frame.rev !== 'string' || frame.rev === previous) return undefined
        return frame.rev
      }
      if (frame.type !== 'graph') return undefined
      const rows = frame.graph === null || typeof frame.graph !== 'object' ? undefined : frame.graph.modules
      const list = Array.isArray(rows) ? rows : []
      const row = list.find(entry => entry !== null && typeof entry === 'object' && entry.id === moduleId)
      if (row === undefined || typeof row.rev !== 'string' || row.rev === previous) return undefined
      return row.rev
    }

    /**
     * Split one text buffer into the payloads of the frames it holds.
     *
     * The Host writes `data: <json>` followed by a blank line per frame, so a
     * growing read keeps its unterminated tail for the next chunk.
     * @param buffer - the text read so far.
     * @returns each complete frame's payload, and the tail to carry forward.
     */
    function eventFrames(buffer) {
      const parts = String(buffer).split('\n\n')
      const rest = parts.pop() ?? ''
      const frames = []
      for (const part of parts) {
        const data = part.split('\n')
          .filter(line => line.startsWith('data:'))
          .map(line => line.slice(5).replace(/^ /u, ''))
          .join('\n')
        if (data !== '') frames.push(data)
      }
      return { frames, rest }
    }

    /** The revision the page booted with for one module. */
    function moduleRevision(modules, moduleId) {
      const rows = modules === null || modules === undefined ? undefined : modules.manifest?.modules
      const list = Array.isArray(rows) ? rows : []
      const row = list.find(entry => entry !== null && typeof entry === 'object' && entry.id === moduleId)
      return row !== undefined && typeof row.rev === 'string' ? row.rev : undefined
    }

    /** The request carrier the shell publishes, or the page's own `fetch`. */
    function shellFetch() {
      const transport = globalThis.__DSH_TRANSPORT__
      if (transport !== undefined && transport !== null && typeof transport.fetch === 'function') return transport.fetch
      return typeof fetch === 'function' ? fetch : undefined
    }

    /**
     * The revision the Host now serves for one module.
     *
     * `entries.reload(id, rev)` rewrites the bundle URL's `rev` query, and the
     * Host answers a revision it never published with 404 — so the revision has
     * to come from the Host. Its reload chain republishes the graph on the
     * document-relative events route the shipped HMR client already reads; this
     * reads that stream until a frame names a revision the page is not running.
     * @param moduleId - the module whose revision to read.
     * @param previous - the revision the page is running now.
     * @param timeoutMs - how long the read may take before it gives up.
     * @returns the new revision, or `undefined` when none arrives in time.
     */
    async function nextRevision(moduleId, previous, timeoutMs = REVISION_TIMEOUT_MS) {
      const request = shellFetch()
      if (request === undefined || typeof AbortController !== 'function') return undefined
      const controller = new AbortController()
      const timer = window.setTimeout(() => controller.abort(), timeoutMs)
      try {
        const response = await request(EVENTS_ROUTE, {
          method: 'GET',
          headers: { accept: 'text/event-stream' },
          signal: controller.signal,
        })
        if (response?.ok !== true || response.body === null || response.body === undefined) return undefined
        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''
        for (;;) {
          const { done, value } = await reader.read()
          if (done === true) return undefined
          buffer += decoder.decode(value, { stream: true })
          const { frames, rest } = eventFrames(buffer)
          buffer = rest
          for (const frame of frames) {
            const rev = revisionOfFrame(frame, moduleId, previous)
            if (rev === undefined) continue
            try {
              await reader.cancel()
            } catch (error) {
              // The stream is being abandoned either way.
            }
            return rev
          }
        }
      } catch (error) {
        return undefined
      } finally {
        window.clearTimeout(timer)
      }
    }

    /**
     * Replace this bundle's browser half in place.
     *
     * The shipped HMR client makes the same call when it sees a `rebuilt` frame;
     * this one makes the click deterministic instead of a race with it. Two
     * surfaces ask for it — the update control after an applied update, and the
     * MCP page's own Reload button — so each passes the breadcrumb writer of the
     * surface the person is looking at.
     * @param modules - the client module system, from its own optional scope.
     * @param log - which breadcrumb writer records a failed replacement.
     * @returns `replaced`, `absent` (no module system on this page), `stale` (the
     * Host published no new revision) or `failed` (the replacement threw).
     */
    async function reloadBrowserHalf(modules, log = updateWrite) {
      const entries = modules === null || modules === undefined ? undefined : modules.entries
      if (entries === undefined || entries === null || typeof entries.reload !== 'function') return 'absent'
      const rev = await nextRevision(PACKAGE_NAME, moduleRevision(modules, PACKAGE_NAME))
      if (rev === undefined) return 'stale'
      try {
        await entries.reload(PACKAGE_NAME, rev)
        return 'replaced'
      } catch (error) {
        log({ phase: 'reload-failed', rev, message: messageOf(error) })
        return 'failed'
      }
    }

    /**
     * `IconDownloadOutlineRegular`, as drawn in the shipped icon set.
     *
     * The path data is copied verbatim from `@deepseek-ai/dsh-client-ui-primitives`
     * (16 by 16 box, 1px stroke, `currentColor`): the arrow into the tray, which
     * is the mark this app already puts on "bring a new version in" — the Plugin
     * Manager's install menu item and the desktop-update action both use it.
     */
    const ICON_UPDATE = [
      'M8 1.95317V10.0469',
      'M4.25 6.29688L8 10.0469L11.75 6.29688',
      'M1.5 10.0469V13.158C1.5 13.3937 1.60536 13.6198 1.79289 13.7865C1.98043 13.9532 2.23478 14.0469 2.5 14.0469H13.5C13.7652 14.0469 14.0196 13.9532 14.2071 13.7865C14.3946 13.6198 14.5 13.3937 14.5 13.158V10.0469',
    ]

    /**
     * `IconRefreshOutlineRegular`, from the same shipped set.
     *
     * The circular arrow the Plugin Manager paints on its own Update action and
     * on its refresh button, i.e. the shipped mark for "load this again". Used
     * here for Reload so the two glyphs say two different things: download a
     * version, refresh the interface.
     */
    const ICON_RELOAD = [
      'M14.5001 8C14.5 9.28552 14.1188 10.5422 13.4045 11.611C12.6903 12.6799 11.6752 13.5129 10.4875 14.0049C9.29982 14.4968 7.99295 14.6255 6.73212 14.3747C5.4713 14.124 4.31314 13.505 3.4041 12.596C2.49514 11.687 1.87614 10.5288 1.62537 9.26798C1.37459 8.00716 1.50331 6.70028 1.99525 5.51261C2.48719 4.32494 3.32025 3.30981 4.3891 2.59557C5.45795 1.88134 6.71458 1.50008 8.0001 1.5C9.9001 1.5 11.7001 2.3 13.0001 3.6L14.5001 5.1',
      'M14.4999 1.5V5.1H10.8999',
    ]

    /**
     * One shipped glyph, at the size the Plugin Manager's action row draws them.
     *
     * The geometry stays in its own 16 unit box and only the rendered box
     * changes, which is how the shipped components are reused at 13 and 14px
     * beside their own buttons. Decorative by construction: the button's label
     * is the accessible name, so the glyph is hidden from assistive technology.
     * @param paths - the glyph's path data, in its 16 by 16 space.
     * @param size - the rendered box in pixels.
     */
    function icon(paths, size = 14) {
      return h('svg', {
        width: size,
        height: size,
        viewBox: '0 0 16 16',
        fill: 'none',
        strokeWidth: 1,
        'aria-hidden': 'true',
        focusable: 'false',
      }, ...paths.map(d => h('path', { key: d, d, stroke: 'currentColor' })))
    }

    /**
     * The style one control in the Plugin Manager's action row wears.
     *
     * That row belongs to the shipped page, so its buttons carry their look
     * inline rather than in a stylesheet: 24px tall beside the shipped 28px
     * buttons, a 12px label with a small gap for the glyph, and the hover fill
     * swapped by the component's own hover state.
     * @param primary - whether this control is the one to press (an update offered).
     * @param hover - whether the pointer is over it.
     * @param actionable - whether pressing it does anything.
     */
    function controlStyle(primary, hover, actionable) {
      return {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
        height: '24px',
        padding: '0 8px',
        border: primary ? '1px solid var(--dsw-alias-brand-primary)' : '1px solid transparent',
        borderRadius: '6px',
        background: hover && actionable ? 'var(--dsw-alias-bg-layer-1)' : 'transparent',
        color: primary ? 'var(--dsw-alias-brand-primary)' : 'var(--dsw-alias-label-secondary)',
        font: 'inherit',
        fontSize: '12px',
        lineHeight: '16px',
        whiteSpace: 'nowrap',
        cursor: actionable ? 'pointer' : 'default',
        flexShrink: 0,
        userSelect: 'none',
        transition: 'background 120ms ease, color 120ms ease',
      }
    }

    /**
     * The colours a reload note takes, matching the tones the switch uses.
     * @param tone - `ok`, `warn`, or `bad`.
     */
    function noteColour(tone) {
      if (tone === 'ok') return 'var(--dsw-alias-state-success-primary)'
      if (tone === 'warn') return 'var(--dsw-alias-state-warn-primary)'
      return 'var(--dsw-alias-state-error-primary)'
    }

    /**
     * The Plugin Manager action that updates EDH from its published repo.
     *
     * It checks on mount, quietly, and then offers the one thing it can do: apply
     * the published version, or re-check after a failure. It renders only on
     * EDH's own detail page and only while the update row is loaded, so a profile
     * whose patch predates the row never shows a control in front of a route
     * that does not exist yet.
     * @param t - the dictionary's translate function.
     * @param controller - the switch controller holding the row states.
     * @param reloader - holds the optional `modules` reload face.
     */
    function createUpdateControl(t, controller, reloader) {
      const useUpdateEnabled = createFeatureHook(controller, UPDATE_MODULE, rowEnabled)

      return function EdhUpdateControl({ subject }) {
        const enabled = useUpdateEnabled()
        const target = updateSubject(subject)
        const [state, setState] = React.useState(IDLE_UPDATE)
        const [hover, setHover] = React.useState(false)

        const check = React.useCallback(async () => {
          setState(previous => ({ ...previous, status: 'checking' }))
          let answer
          try {
            answer = await requestUpdate('GET')
          } catch (error) {
            updateWrite({ phase: 'failed', stage: 'check', reason: 'error', message: messageOf(error) })
            setState(readCheck({ ok: false, reason: 'error' }))
            return
          }
          const checked = readCheck(answer)
          if (checked.status === 'failed') {
            updateWrite({ phase: 'failed', stage: 'check', reason: checked.reason })
          } else {
            updateWrite({ phase: 'checked', status: checked.status, installed: checked.installed, latest: checked.latest })
          }
          setState(checked)
        }, [])

        const apply = React.useCallback(async () => {
          setState(previous => ({ ...previous, status: 'updating' }))
          updateWrite({ phase: 'update-started', latest: state.latest })
          let answer
          try {
            answer = await requestUpdate('POST')
          } catch (error) {
            updateWrite({ phase: 'failed', stage: 'apply', reason: 'error', message: messageOf(error) })
            setState(readApply({ ok: false, reason: 'error' }))
            return
          }
          const applied = readApply(answer)
          setState(applied)
          if (applied.status === 'failed') {
            updateWrite({ phase: 'failed', stage: 'apply', reason: applied.reason })
            return
          }
          updateWrite({
            phase: 'updated',
            from: applied.from,
            to: applied.to,
            requiresRestart: applied.status === 'updated-needs-restart',
          })
          if (applied.status !== 'updated-live') return
          // The Host reports the new half is live; hand this bundle to the client
          // module system so the new browser half runs instead of the old one.
          const reload = reloader.current
          const reloaded = typeof reload === 'function' ? await reload() : 'absent'
          if (reloaded === 'replaced') return
          updateWrite({ phase: 'updated-needs-restart', reload: reloaded })
          setState(previous => ({ ...previous, status: 'updated-needs-restart' }))
        }, [state.latest])

        // Check quietly as soon as the page proves to be EDH's own and the row
        // that answers the route is loaded.
        React.useEffect(() => {
          if (target === undefined || !enabled) return
          updateWrite({ phase: 'mounted', subject: target, module: UPDATE_MODULE, reload: typeof reloader.current === 'function' })
          void check()
        }, [target, enabled])

        if (!enabled || target === undefined) return null

        const busy = state.status === 'checking' || state.status === 'updating'
        const actionable = state.status === 'update-available'
          || state.status === 'up-to-date'
          || state.status === 'not-a-checkout'
          || state.status === 'failed'
        const primary = state.status === 'update-available'
        const text = updateText(state, t)

        return h('button', {
          type: 'button',
          'aria-label': text.label,
          'aria-busy': busy || undefined,
          title: text.title,
          disabled: !actionable,
          onClick: () => {
            if (!actionable) return
            if (state.status === 'update-available') void apply()
            else void check()
          },
          onMouseEnter: () => setHover(true),
          onMouseLeave: () => setHover(false),
          style: controlStyle(primary, hover, actionable),
        }, icon(ICON_UPDATE), text.label)
      }
    }

    /**
     * The Plugin Manager action that reloads EDH's interface in place.
     *
     * It sits beside the update control and replaces the same browser half, but
     * it is not the update feature: it asks the module system for a new revision
     * of what is already installed. So it follows the `modules` service and
     * nothing else — not the update row, which only gates the route that fetches
     * a new version. Without that service there is no reload to offer, and the
     * control is absent rather than dead.
     * @param t - the dictionary's translate function.
     * @param reloader - holds the optional `modules` reload face.
     */
    function createReloadControl(t, reloader) {
      return function EdhReloadControl({ subject }) {
        const target = updateSubject(subject)
        const [state, setState] = React.useState({ status: 'idle', reason: '' })
        const [hover, setHover] = React.useState(false)
        const face = reloader.current

        // A confirmation is not a status: it clears itself, so the row goes
        // quiet again without being clicked. A failure stays until retried.
        React.useEffect(() => {
          if (state.status !== 'done' && state.status !== 'needs-restart') return undefined
          const timer = window.setTimeout(() => setState({ status: 'idle', reason: '' }), RELOAD_NOTE_MS)
          return () => window.clearTimeout(timer)
        }, [state.status])

        const onReload = React.useCallback(async () => {
          setState({ status: 'reloading', reason: '' })
          setState(await runReload({ reload: reloader.current, check: () => requestUpdate('GET'), log: updateWrite }))
        }, [])

        if (!reloadVisible(target, face)) return null

        const copy = reloadText(state, t)
        const busy = state.status === 'reloading'

        return h('span', { style: { display: 'inline-flex', alignItems: 'center', gap: '8px' } },
          copy.note === ''
            ? null
            : h('span', {
              role: copy.tone === 'bad' ? 'alert' : 'status',
              style: {
                color: noteColour(copy.tone),
                fontSize: '12px',
                lineHeight: '16px',
                whiteSpace: 'nowrap',
              },
            }, copy.note),
          // The visible word is the accessible name; the tooltip says what it
          // replaces, which is the part that needs explaining.
          h('button', {
            type: 'button',
            title: t('reloadTitle'),
            'aria-busy': busy || undefined,
            disabled: busy,
            onClick: () => {
              void onReload()
            },
            onMouseEnter: () => setHover(true),
            onMouseLeave: () => setHover(false),
            style: controlStyle(false, hover, !busy),
          }, icon(ICON_RELOAD), copy.label),
        )
      }
    }

    /**
     * One request on the update route. The Host answers a report with 200 and
     * only an unsupported method with anything else, so a non-200 status is the
     * route failing rather than a version being unavailable.
     * @param method - `GET` to check, `POST` to apply.
     * @returns the parsed answer.
     */
    async function requestUpdate(method) {
      const response = await fetch(UPDATE_ROUTE, { method, headers: { accept: 'application/json' } })
      if (response?.ok !== true) throw new Error(`${UPDATE_ROUTE} answered ${response?.status ?? 'nothing'}`)
      return await response.json()
    }

    // ---------------------------------------------------------------------
    // MCP servers
    //
    // The Host half owns the server list, the MCP connections, and the tools
    // they expose. The browser's job is the page in Settings where a person
    // adds a server, sees whether it connected, and stops it — no Loader row,
    // no profile edit, no Cordis config.
    // ---------------------------------------------------------------------

    /**
     * The Host route that reads the server list (`GET`) and changes it (`POST`),
     * in the document-relative form the browser resolves against its own base.
     */
    const MCP_ROUTE = 'api/edh.mcp'

    /** The row that owns the route; the page is useless without it. */
    const MCP_MODULE = '@moreweb/edh/mcp'

    /**
     * The Settings seat: one page in the Settings navigation. The settings shell
     * declares `settings.section` as a root list slot, and its `{ id, order,
     * label }` entries become the ordered nav cells — so an entry here is a
     * page of its own, not a tab under the built-in Plugins page.
     */
    const MCP_SECTION_SLOT = 'settings.section'

    /**
     * Where that page sits in the nav. The shipped sections are General (0),
     * Models (10) and Plugins (15), so 16 is the first free seat after them: the
     * shipped pages stay contiguous, and this one is the next page rather than
     * an appendix at some arbitrary number.
     */
    const MCP_SECTION_ORDER = 16

    /** Every action the route accepts besides reading. */
    const MCP_ACTIONS = ['add', 'remove', 'test', 'start', 'stop']

    /** How long a reload confirmation stays before it clears itself. */
    const RELOAD_NOTE_MS = 6000

    /**
     * The last failure the Host reported, in its own words.
     * @param source - a server record or a route answer.
     * @returns the sentence to show, or an empty string when nothing failed.
     */
    function failureText(source) {
      if (source === null || typeof source !== 'object') return ''
      for (const field of ['lastError', 'error', 'message', 'detail']) {
        const value = source[field]
        if (typeof value === 'string' && value.trim() !== '') return value.trim()
        if (value !== null && typeof value === 'object' && typeof value.message === 'string' && value.message.trim() !== '') {
          return value.message.trim()
        }
      }
      return ''
    }

    /**
     * One MCP server record, read without trusting the Host's shape.
     *
     * Only the fields the page renders are copied. A server record also carries
     * keys and paths for its secrets — `hasToken` here is a boolean, and nothing
     * secret survives this projection, so no response can echo a token into the
     * DOM by accident.
     * @param raw - one entry from a `servers` list.
     * @returns the record, or `undefined` when it has no usable id.
     */
    function serverRecord(raw) {
      if (raw === null || typeof raw !== 'object') return undefined
      const id = typeof raw.id === 'string' ? raw.id.trim() : ''
      if (id === '') return undefined
      const label = typeof raw.label === 'string' && raw.label.trim() !== '' ? raw.label.trim() : id
      const count = Number(raw.toolCount)
      return {
        id,
        label,
        transport: raw.transport === 'http' ? 'http' : 'stdio',
        enabled: raw.enabled !== false,
        status: typeof raw.status === 'string' ? raw.status.trim().toLowerCase() : '',
        toolCount: Number.isFinite(count) && count > 0 ? Math.trunc(count) : 0,
        hasToken: raw.hasToken === true,
        failure: failureText(raw),
      }
    }

    /**
     * One action's outcome, read from the route's `report`.
     *
     * A rejected input answers a non-200 status with this same body, so the
     * outcome is read here rather than from the HTTP status.
     * @param value - the `report` field of a route answer.
     * @returns the outcome, or `undefined` when the answer carries none.
     */
    function actionReport(value) {
      if (value === null || typeof value !== 'object') return undefined
      const count = Number(value.toolCount)
      return {
        ok: value.ok === true,
        action: typeof value.action === 'string' ? value.action : '',
        id: typeof value.id === 'string' ? value.id : '',
        status: typeof value.status === 'string' ? value.status : '',
        reason: typeof value.reason === 'string' ? value.reason : '',
        message: typeof value.message === 'string' ? value.message.trim() : '',
        toolCount: Number.isFinite(count) && count > 0 ? Math.trunc(count) : 0,
      }
    }

    /**
     * The sentence for one refusal reason the Host names without a message.
     * @param reason - `not-ready`, `unknown-server`, or any other code.
     * @returns the dictionary key of the sentence to show.
     */
    function reasonSentence(reason) {
      switch (reason) {
        case 'not-ready': return 'mcpNotReady'
        case 'unknown-server': return 'mcpUnknownServer'
        default: return 'mcpActionFailed'
      }
    }

    /**
     * Whether one refusal was about what the form said rather than what the
     * server did — the cases where the server was not stored, so the panel has
     * to stay open for the person to correct it.
     * @param reason - the report's `reason`.
     */
    function inputRejection(reason) {
      return reason === 'bad-input'
        || reason === 'bad-id'
        || reason === 'bad-transport'
        || reason === 'bad-command'
        || reason === 'bad-url'
    }

    /**
     * The view one route answer describes.
     *
     * A `GET` answers the list; a `POST` answers the same list plus a report for
     * the action it ran, and the list in that answer is the one to adopt — the
     * page never re-reads to find out what its own write did.
     * @param payload - the route's parsed answer.
     * @returns whether the answer carries a list, the servers, the action
     *   report, and the sentence explaining anything that failed.
     */
    function readMcpView(payload) {
      const answer = payload !== null && typeof payload === 'object' ? payload : {}
      const list = Array.isArray(answer.servers)
      const servers = []
      for (const raw of list ? answer.servers : []) {
        const record = serverRecord(raw)
        if (record !== undefined) servers.push(record)
      }
      const report = actionReport(answer.report)
      let failure = ''
      if (report !== undefined && report.ok !== true && report.message !== '') failure = report.message
      if (failure === '' && answer.ok === false) failure = failureText(answer)
      return { ok: list || answer.ok === true, list, servers, report, failure }
    }

    /**
     * The connection state one server record is in.
     *
     * The page names four states and no more, so the Host's vocabulary is folded
     * into them; a row whose switch is off reads Off whatever the connection
     * says, because nothing is meant to be running behind it.
     * @param server - a `serverRecord` result.
     * @returns `connected`, `starting`, `failed`, or `off`.
     */
    function serverState(server) {
      if (server === null || typeof server !== 'object') return 'off'
      if (server.enabled === false) return 'off'
      switch (server.status) {
        case 'connected':
        case 'ready':
        case 'running':
        case 'online':
          return 'connected'
        case 'failed':
        case 'error':
        case 'crashed':
          return 'failed'
        case 'off':
        case 'stopped':
        case 'disabled':
        case 'idle':
          return 'off'
        case 'starting':
        case 'connecting':
        case 'pending':
        case 'restarting':
          return 'starting'
        default:
          // An unknown status is not a claim of health: a failure line wins,
          // and otherwise the row says it is still coming up.
          return typeof server.failure === 'string' && server.failure !== '' ? 'failed' : 'starting'
      }
    }

    /**
     * The dictionary key of one state's one word.
     * @param state - a `serverState` result.
     */
    function stateLabel(state) {
      switch (state) {
        case 'connected': return 'mcpStateConnected'
        case 'starting': return 'mcpStateStarting'
        case 'failed': return 'mcpStateFailed'
        default: return 'mcpStateOff'
      }
    }

    /**
     * The colour one state paints its dot: `ok`, `busy`, `bad`, or `off`.
     * @param state - a `serverState` result.
     */
    function stateTone(state) {
      switch (state) {
        case 'connected': return 'ok'
        case 'starting': return 'busy'
        case 'failed': return 'bad'
        default: return 'off'
      }
    }

    /** A blank add form: the Command branch, which is the common case. */
    function emptyServerForm() {
      return { branch: 'command', label: '', command: '', args: '', env: '', url: '', authorization: '' }
    }

    /**
     * One text field's lines, with blank ones dropped.
     * @param text - a textarea's value.
     */
    function splitLines(text) {
      return String(text ?? '').split(/\r?\n/u).map(line => line.trim()).filter(line => line !== '')
    }

    /**
     * Environment lines folded into one map.
     * @param text - one `NAME=value` per line.
     * @returns the map, or `{ ok: false }` when a line is not a pair.
     */
    function environmentMap(text) {
      const env = {}
      for (const line of splitLines(text)) {
        const at = line.indexOf('=')
        if (at <= 0) return { ok: false }
        const name = line.slice(0, at).trim()
        if (name === '') return { ok: false }
        env[name] = line.slice(at + 1).trim()
      }
      return { ok: true, env }
    }

    /** An absolute http(s) URL, without depending on the URL global. */
    const HTTP_URL = /^https?:\/\/[^\s/?#]+(?:[/?#][^\s]*)?$/iu

    /**
     * Whether one string is an absolute http(s) URL.
     * @param text - the URL field's value.
     */
    function isHttpUrl(text) {
      return typeof text === 'string' && HTTP_URL.test(text.trim())
    }

    /**
     * The name a server takes when the person left the field empty: the command
     * as typed without its script suffix, or the URL's host.
     * @param draft - the transport plus the field it names.
     */
    function defaultServerName(draft) {
      if (draft.transport === 'http') {
        const match = /^https?:\/\/([^\s/?#]+)/iu.exec(String(draft.url ?? ''))
        return match === null ? String(draft.url ?? '') : match[1]
      }
      const parts = String(draft.command ?? '').split(/[\\/]+/u)
      const last = parts[parts.length - 1] ?? ''
      return last.replace(/\.(?:cmd|exe|bat|ps1)$/iu, '')
    }

    /**
     * Turn the add form into the server the Host should create.
     *
     * The two branches never share fields: a Command server has no URL, a URL
     * server has no command, and only the URL branch can carry a credential.
     * @param form - the add form's current values.
     * @returns the server to add, or the field and sentence that block it.
     */
    function validateServer(form) {
      const draft = form !== null && typeof form === 'object' ? form : {}
      const typed = typeof draft.label === 'string' ? draft.label.trim() : ''
      if (draft.branch === 'url') {
        const url = typeof draft.url === 'string' ? draft.url.trim() : ''
        if (!isHttpUrl(url)) return { ok: false, field: 'url', message: 'mcpUrlInvalid' }
        const authorization = typeof draft.authorization === 'string' ? draft.authorization.trim() : ''
        return {
          ok: true,
          server: {
            label: typed === '' ? defaultServerName({ transport: 'http', url }) : typed,
            transport: 'http',
            url,
            ...(authorization === '' ? {} : { authorization }),
          },
        }
      }
      const command = typeof draft.command === 'string' ? draft.command.trim() : ''
      if (command === '') return { ok: false, field: 'command', message: 'mcpCommandRequired' }
      const environment = environmentMap(draft.env)
      if (!environment.ok) return { ok: false, field: 'env', message: 'mcpEnvInvalid' }
      const env = environment.env
      return {
        ok: true,
        server: {
          label: typed === '' ? defaultServerName({ transport: 'stdio', command }) : typed,
          transport: 'stdio',
          command,
          args: splitLines(draft.args),
          ...(Object.keys(env).length === 0 ? {} : { env }),
        },
      }
    }

    /**
     * The body that adds one server.
     * @param server - a `validateServer` result's server.
     */
    function addServerBody(server) {
      return { action: 'add', server }
    }

    /**
     * The body that names one stored server and what to do with it.
     * @param action - one of `MCP_ACTIONS` besides `add`.
     * @param id - the server's id.
     */
    function serverActionBody(action, id) {
      return { action, id }
    }

    /**
     * One request on the MCP route.
     *
     * The Host answers a rejected input with a non-200 status and the same JSON
     * body it would answer 200 with, so the body decides — only a reply without
     * one is a route failure.
     * @param method - `GET` to read, `POST` to change.
     * @param body - the request body, if the method takes one.
     * @returns the parsed answer.
     */
    async function requestMcp(method, body) {
      const response = await fetch(MCP_ROUTE, {
        method,
        headers: body === undefined
          ? { accept: 'application/json' }
          : { accept: 'application/json', 'content-type': 'application/json' },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      })
      if (response === null || response === undefined) throw new Error(`${MCP_ROUTE} answered nothing`)
      let answer
      try {
        answer = await response.json()
      } catch (error) {
        answer = undefined
      }
      if (answer !== null && typeof answer === 'object') return answer
      throw new Error(`${MCP_ROUTE} answered ${response.status}`)
    }

    /** The busy map without one entry, so a finished row stops saying "…". */
    function withoutKey(map, key) {
      const next = { ...map }
      delete next[key]
      return next
    }

    /**
     * Whether a Plugin Manager detail page may offer the Reload button.
     *
     * Two conditions, neither of them a feature row: the page has to be EDH's
     * own (nothing else could sensibly reload EDH's interface), and the client
     * module system has to be there to ask for a new revision. The update row is
     * deliberately *not* consulted — reloading what is installed is not the
     * update feature, and it stays useful on a profile that paused updating.
     * @param target - the page's subject, as `updateSubject` reads it.
     * @param reload - the shared reload face, when the page has one.
     */
    function reloadVisible(target, reload) {
      return target !== undefined && typeof reload === 'function'
    }

    /**
     * Whether the Host half on disk is newer than the one this process loaded.
     *
     * `installed` is the version the Host is running; `onDisk` is what a restart
     * would read. They differ whenever an update moved a Host module, and only the
     * update route knows — a browser half cannot tell from its own bundle whether
     * the code behind it changed. An unreadable or refusing answer is `known:
     * false`, never a claim that a restart is needed.
     * @param answer - a `GET api/edh.update` answer.
     * @returns both versions, whether they were readable, and whether they differ.
     */
    function hostStaleness(answer) {
      const value = answer !== null && typeof answer === 'object' ? answer : {}
      const installed = typeof value.installed === 'string' ? value.installed.trim() : ''
      const onDisk = typeof value.onDisk === 'string' ? value.onDisk.trim() : ''
      const known = value.ok === true && installed !== '' && onDisk !== ''
      return { known, installed, onDisk, stale: known && installed !== onDisk }
    }

    /**
     * The state one reload attempt leaves.
     *
     * A replaced browser half is a success even when the Host half behind it is
     * stale, but it is not an update: when the two versions differ the page says a
     * restart is still owed instead of claiming the change is complete.
     * @param outcome - `reloadBrowserHalf`'s answer.
     * @param staleness - a `hostStaleness` result.
     */
    function reloadOutcome(outcome, staleness) {
      if (outcome === 'replaced') {
        const stale = staleness !== null && typeof staleness === 'object' && staleness.stale === true
        return { status: stale ? 'needs-restart' : 'done', reason: '' }
      }
      return { status: 'failed', reason: outcome === 'stale' ? 'revision' : 'reload' }
    }

    /**
     * The label, note, and tone one reload state shows.
     *
     * Kept pure so the Node test can pin the copy the control actually shows
     * instead of reading it back out of a rendered element.
     * @param state - the reload control's current state.
     * @param t - the dictionary's translate function.
     * @returns the visible label, the note beside it, and the note's tone.
     */
    function reloadText(state, t) {
      const status = state !== null && typeof state === 'object' ? state.status : undefined
      const reason = state !== null && typeof state === 'object' ? state.reason : undefined
      switch (status) {
        case 'reloading':
          return { label: t('reloading'), note: '', tone: '' }
        case 'done':
          return { label: t('reload'), note: t('reloadDone'), tone: 'ok' }
        case 'needs-restart':
          return { label: t('reload'), note: t('reloadStale'), tone: 'warn' }
        case 'failed':
          return {
            label: t('reload'),
            note: t(reason === 'revision' ? 'reloadNoRevision' : 'reloadFailed'),
            tone: 'bad',
          }
        default:
          return { label: t('reload'), note: '', tone: '' }
      }
    }

    /**
     * One reload attempt: ask what the Host half is, replace the browser half
     * through the shared reload face, and record what happened.
     *
     * It never throws. The page has to stay usable whether the check was refused,
     * the module system was absent, or the replacement itself blew up, so every
     * branch returns a state the caller can render and the failure is recorded
     * rather than raised. A refused check is not recorded separately: the
     * breadcrumb key holds one payload, so the attempt's own record — with
     * `known: false` — is the one that explains it.
     * @param options - the reload face, the version check, and the breadcrumb writer.
     * @returns the state to show.
     */
    async function runReload({ reload, check, log }) {
      let staleness = hostStaleness(undefined)
      try {
        staleness = hostStaleness(await check())
      } catch (error) {
        // An older Host half need not answer the update route; the replacement
        // can still work, it just cannot say anything about the Host half.
      }
      let outcome
      try {
        outcome = typeof reload === 'function' ? await reload(log) : 'absent'
      } catch (error) {
        log({ phase: 'reload-failed', reason: 'error', message: messageOf(error), known: staleness.known })
        return { status: 'failed', reason: 'reload' }
      }
      const next = reloadOutcome(outcome, staleness)
      if (next.status === 'failed') {
        log({ phase: 'reload-failed', reason: next.reason, outcome, known: staleness.known })
      } else {
        log({ phase: 'reloaded', ok: true, stale: next.status === 'needs-restart', known: staleness.known })
      }
      return next
    }

    /**
     * The server page: its own heading, one row per server, and one inline panel
     * to add another.
     *
     * It carries the page frame the shipped sections use — a heading and one
     * introduction line over a 760px column — because a Settings section is a
     * page, and the nav cell alone does not say what the page is for.
     *
     * It reads the `mcp` row's own enablement rather than the aggregate, because
     * the row is what mounts the route behind it — before the restart that
     * mounts the row there would be a page in front of nothing. The nav entry is
     * gated the same way where it is registered; this is the answer for the one
     * case registration cannot cover, a row switched off while the page is open.
     * @param t - the dictionary's translate function.
     * @param controller - the switch controller holding the row states.
     */
    function createMcpPage(t, controller) {
      const useMcpEnabled = createFeatureHook(controller, MCP_MODULE, rowEnabled)

      return function EdhMcpPage() {
        const enabled = useMcpEnabled()
        const [view, setView] = React.useState({ status: 'loading', servers: [], failure: '' })
        const [attempt, setAttempt] = React.useState(0)
        const [panel, setPanel] = React.useState(false)
        const [form, setForm] = React.useState(emptyServerForm)
        const [formError, setFormError] = React.useState({ field: '', message: '' })
        const errorId = React.useId()
        const [notice, setNotice] = React.useState({ text: '', tone: 'bad' })
        const [busy, setBusy] = React.useState({})
        const firstField = React.useRef(null)

        // Read once on mount and once per retry: the page never polls, because
        // every change answers the new list itself.
        React.useEffect(() => {
          if (!enabled) return undefined
          let current = true
          setView(previous => ({ status: 'loading', servers: previous.servers, failure: '' }))
          void (async () => {
            let answer
            try {
              answer = await requestMcp('GET')
            } catch (error) {
              if (!current) return
              mcpWrite({ phase: 'failed', action: 'read', message: messageOf(error) })
              setView({ status: 'error', servers: [], failure: messageOf(error) })
              return
            }
            if (!current) return
            const read = readMcpView(answer)
            if (!read.ok) {
              mcpWrite({ phase: 'failed', action: 'read', reason: String(answer?.reason ?? 'error') })
              setView({ status: 'error', servers: read.servers, failure: read.failure })
              return
            }
            mcpWrite({ phase: 'loaded', count: read.servers.length })
            setView({ status: 'ready', servers: read.servers, failure: '' })
          })()
          return () => {
            current = false
          }
        }, [enabled, attempt])

        const closePanel = React.useCallback(() => {
          setPanel(false)
          setForm(emptyServerForm())
          setFormError({ field: '', message: '' })
        }, [])

        // Escape closes the panel wherever the focus is inside the page.
        React.useEffect(() => {
          if (!panel) return undefined
          const onKey = event => {
            if (event.key === 'Escape') closePanel()
          }
          document.addEventListener('keydown', onKey)
          return () => document.removeEventListener('keydown', onKey)
        }, [panel, closePanel])

        // The panel opens with the cursor in the field the branch needs.
        React.useEffect(() => {
          if (!panel) return
          const field = firstField.current
          if (field !== null) field.focus()
        }, [panel])

        /**
         * One change on the route: the answer's list replaces the one on screen,
         * and a failure keeps the last good list and says what happened.
         * @returns the adopted view and whether the Host accepted the action, or
         *   `undefined` when no answer arrived at all.
         */
        const submit = React.useCallback(async (action, key, body) => {
          setBusy(previous => ({ ...previous, [key]: action }))
          setNotice({ text: '', tone: 'bad' })
          let answer
          try {
            answer = await requestMcp('POST', body)
          } catch (error) {
            mcpWrite({ phase: 'failed', action, message: messageOf(error) })
            setBusy(previous => withoutKey(previous, key))
            setNotice({ text: messageOf(error), tone: 'bad' })
            return undefined
          }
          setBusy(previous => withoutKey(previous, key))
          const read = readMcpView(answer)
          if (read.list) setView({ status: 'ready', servers: read.servers, failure: '' })
          const rejected = read.report !== undefined && read.report.ok !== true
          if (read.failure !== '' || rejected) {
            const sentence = read.failure !== '' ? read.failure : t(reasonSentence(read.report.reason))
            mcpWrite({ phase: 'failed', action, reason: String(read.report?.reason ?? 'error'), message: sentence })
            setNotice({ text: sentence, tone: 'bad' })
            return { read, ok: false }
          }
          return { read, ok: true }
        }, [t])

        const onAdd = React.useCallback(async () => {
          const checked = validateServer(form)
          if (!checked.ok) {
            setFormError({ field: checked.field, message: checked.message })
            return
          }
          setFormError({ field: '', message: '' })
          const done = await submit('add', 'add', addServerBody(checked.server))
          if (done === undefined) return
          if (done.ok) {
            mcpWrite({ phase: 'added', label: checked.server.label, transport: checked.server.transport })
            closePanel()
            return
          }
          // A refused field is the panel's to fix. Anything else means the
          // server was stored and its row now carries the reason, so the panel
          // gets out of the way.
          if (!inputRejection(done.read.report?.reason ?? '')) closePanel()
        }, [form, submit, closePanel])

        const onTest = React.useCallback(async id => {
          const done = await submit('test', id, serverActionBody('test', id))
          if (done === undefined) return
          const server = done.read.servers.find(candidate => candidate.id === id)
          const tools = done.read.report === undefined
            ? (server === undefined ? 0 : server.toolCount)
            : done.read.report.toolCount
          mcpWrite({
            phase: 'tested',
            id,
            state: server === undefined ? '' : serverState(server),
            tools,
            ok: done.ok,
          })
          // A failed test already has its sentence on screen; only a pass gets one here.
          if (done.ok) setNotice({ text: tools === 1 ? t('mcpTestOne') : t('mcpTestMany', { count: tools }), tone: 'ok' })
        }, [submit, t])

        const onRemove = React.useCallback(async id => {
          const done = await submit('remove', id, serverActionBody('remove', id))
          if (done !== undefined && done.ok) mcpWrite({ phase: 'removed', id })
        }, [submit])

        const onToggle = React.useCallback(async server => {
          // A failed server offers Start: the way back is another attempt.
          const state = serverState(server)
          const action = state === 'off' || state === 'failed' ? 'start' : 'stop'
          const done = await submit(action, server.id, serverActionBody(action, server.id))
          if (done !== undefined && done.ok) mcpWrite({ phase: 'loaded', via: action, id: server.id })
        }, [submit])

        if (!enabled) return h('p', { className: 'edh-mcp-status' }, t('mcpOff'))

        const update = (field, value) => {
          setForm(previous => ({ ...previous, [field]: value }))
          setFormError({ field: '', message: '' })
        }

        /** The attributes that tie one field to the sentence that blocks it. */
        const blocked = field => (formError.field === field
          ? { 'aria-invalid': true, 'aria-describedby': errorId }
          : {})

        const fieldRow = (name, label, control) => h('label', { key: name, className: 'edh-mcp-field' },
          h('span', { className: 'edh-mcp-fieldLabel' }, label),
          control,
        )

        const branchOption = (value, label) => h('button', {
          key: value,
          type: 'button',
          'aria-pressed': form.branch === value,
          className: 'edh-mcp-segOption',
          onClick: () => {
            update('branch', value)
          },
        }, label)

        const adding = busy.add === 'add'

        const panelNode = h('form', {
          className: 'edh-mcp-panel',
          'aria-label': t('mcpAdd'),
          onSubmit: event => {
            event.preventDefault()
            void onAdd()
          },
        },
          h('div', { className: 'edh-mcp-seg', role: 'group', 'aria-label': t('mcpTransport') },
            branchOption('command', t('mcpBranchCommand')),
            branchOption('url', t('mcpBranchUrl')),
          ),
          fieldRow('name', t('mcpName'), h('input', {
            type: 'text',
            className: 'edh-mcp-input',
            value: form.label,
            placeholder: t('mcpNamePlaceholder'),
            spellCheck: false,
            onChange: event => {
              update('label', event.target.value)
            },
          })),
          form.branch === 'url'
            ? [
              fieldRow('url', t('mcpUrl'), h('input', {
                ref: firstField,
                type: 'url',
                className: 'edh-mcp-input',
                value: form.url,
                placeholder: t('mcpUrlPlaceholder'),
                spellCheck: false,
                autoComplete: 'off',
                ...blocked('url'),
                onChange: event => {
                  update('url', event.target.value)
                },
              })),
              fieldRow('authorization', t('mcpAuthorization'), h('input', {
                type: 'password',
                className: 'edh-mcp-input',
                value: form.authorization,
                placeholder: t('mcpAuthorizationPlaceholder'),
                spellCheck: false,
                autoComplete: 'off',
                onChange: event => {
                  update('authorization', event.target.value)
                },
              })),
            ]
            : [
              fieldRow('command', t('mcpCommand'), h('input', {
                ref: firstField,
                type: 'text',
                className: 'edh-mcp-input',
                value: form.command,
                placeholder: t('mcpCommandPlaceholder'),
                spellCheck: false,
                autoComplete: 'off',
                ...blocked('command'),
                onChange: event => {
                  update('command', event.target.value)
                },
              })),
              fieldRow('args', t('mcpArgs'), h('textarea', {
                className: 'edh-mcp-input edh-mcp-textarea',
                value: form.args,
                rows: 3,
                placeholder: t('mcpArgsPlaceholder'),
                spellCheck: false,
                onChange: event => {
                  update('args', event.target.value)
                },
              })),
              fieldRow('env', t('mcpEnv'), h('textarea', {
                className: 'edh-mcp-input edh-mcp-textarea',
                value: form.env,
                rows: 2,
                placeholder: t('mcpEnvPlaceholder'),
                spellCheck: false,
                autoComplete: 'off',
                ...blocked('env'),
                onChange: event => {
                  update('env', event.target.value)
                },
              })),
            ],
          formError.message === ''
            ? null
            : h('p', { className: 'edh-mcp-failure', role: 'alert', id: errorId }, t(formError.message)),
          h('div', { className: 'edh-mcp-panelActions' },
            h('button', {
              type: 'submit',
              className: 'edh-mcp-button edh-mcp-button-primary',
              disabled: adding,
              'aria-busy': adding || undefined,
            }, adding ? t('mcpAdding') : t('mcpAdd')),
            h('button', {
              type: 'button',
              className: 'edh-mcp-button',
              disabled: adding,
              onClick: closePanel,
            }, t('mcpCancel')),
          ),
        )

        const addButton = h('button', {
          type: 'button',
          className: 'edh-mcp-button edh-mcp-button-primary',
          onClick: () => {
            setPanel(true)
          },
        }, t('mcpAdd'))

        const rowFor = server => {
          const state = serverState(server)
          const action = busy[server.id]
          const startable = state === 'off' || state === 'failed'
          const failure = server.failure !== ''
            ? server.failure
            : state === 'failed' ? t('mcpFailedGeneric') : ''
          return h('li', { key: server.id, className: 'edh-mcp-row', 'data-state': state },
            h('div', { className: 'edh-mcp-ident' },
              h('span', { className: 'edh-mcp-name', title: server.id }, server.label),
              h('span', { className: 'edh-mcp-badge' }, server.transport),
            ),
            h('div', { className: 'edh-mcp-state' },
              h('span', {
                className: 'edh-mcp-dot',
                'data-tone': stateTone(state),
                'aria-hidden': true,
              }),
              h('span', null, t(stateLabel(state))),
            ),
            h('div', {
              className: 'edh-mcp-count',
              title: server.toolCount === 1 ? t('mcpToolOne') : t('mcpTools', { count: server.toolCount }),
            }, String(server.toolCount)),
            h('div', { className: 'edh-mcp-actions' },
              h('button', {
                type: 'button',
                className: 'edh-mcp-button edh-mcp-button-sm',
                disabled: action !== undefined,
                'aria-busy': action === 'test' || undefined,
                onClick: () => {
                  void onTest(server.id)
                },
              }, action === 'test' ? t('mcpTesting') : t('mcpTest')),
              h('button', {
                type: 'button',
                className: 'edh-mcp-button edh-mcp-button-sm',
                disabled: action !== undefined,
                'aria-busy': action === 'start' || action === 'stop' || undefined,
                onClick: () => {
                  void onToggle(server)
                },
              }, startable
                ? (action === 'start' ? t('mcpStarting') : t('mcpStart'))
                : (action === 'stop' ? t('mcpStopping') : t('mcpStop'))),
              h('button', {
                type: 'button',
                className: 'edh-mcp-button edh-mcp-button-sm',
                'data-danger': true,
                disabled: action !== undefined,
                onClick: () => {
                  void onRemove(server.id)
                },
              }, action === 'remove' ? t('mcpRemoving') : t('mcpRemove')),
            ),
            failure === '' ? null : h('p', { className: 'edh-mcp-failure' }, failure),
          )
        }

        const servers = view.servers

        return h('div', { className: 'edh-mcp' },
          // The page frame, in every state including a failed read: the heading
          // and its one line are what the nav cell promised, and they are the
          // only part of the page that cannot depend on the route.
          h('h2', { className: 'edh-mcp-title' }, t('mcpTitle')),
          h('p', { className: 'edh-mcp-intro' }, t('mcpIntro')),
          notice.text === '' ? null : h('p', {
            className: 'edh-mcp-notice',
            'data-tone': notice.tone,
            role: notice.tone === 'bad' ? 'alert' : 'status',
          }, notice.text),
          view.status === 'loading'
            ? h('p', { className: 'edh-mcp-status', role: 'status' }, t('mcpLoading'))
            : null,
          view.status === 'error'
            ? h('div', { className: 'edh-mcp-error', role: 'alert' },
              h('p', { className: 'edh-mcp-status' }, t('mcpLoadFailed')),
              view.failure === '' ? null : h('p', { className: 'edh-mcp-failure' }, view.failure),
              h('button', {
                type: 'button',
                className: 'edh-mcp-button edh-mcp-button-primary',
                onClick: () => {
                  setAttempt(value => value + 1)
                },
              }, t('mcpRetry')),
            )
            : null,
          view.status === 'ready' && panel ? panelNode : null,
          view.status === 'ready' && !panel && servers.length === 0
            ? h('div', { className: 'edh-mcp-empty' },
              h('p', null, t('mcpEmpty')),
              addButton,
            )
            : null,
          view.status === 'ready' && !panel && servers.length > 0
            ? h('div', { className: 'edh-mcp-head' }, addButton)
            : null,
          servers.length === 0
            ? null
            : h('ul', { className: 'edh-mcp-list' }, servers.map(server => rowFor(server))),
        )
      }
    }

    /**
     * The page's stylesheet.
     *
     * Class names are ours and every rule is built from the shipped Settings and
     * primitive styles — the same card fill, hairline, focus ring, and small
     * button as the surfaces it sits between.
     */
    const MCP_CSS = [
      '.edh-mcp{color:var(--dsw-alias-label-primary);flex-direction:column;gap:12px;max-width:760px;display:flex}',
      // The page frame both shipped sections that draw one use: a title and one
      // introduction line over the content column.
      '.edh-mcp-title{margin:0;font-size:16px;font-weight:500;line-height:24px}',
      '.edh-mcp-intro{color:var(--dsw-alias-label-tertiary);margin:0;font-size:14px;line-height:22px}',
      '.edh-mcp-status{color:var(--dsw-alias-label-tertiary);margin:0;font-size:13px;line-height:20px}',
      '.edh-mcp-error,.edh-mcp-empty{flex-direction:column;align-items:flex-start;gap:10px;display:flex}',
      '.edh-mcp-empty p{color:var(--dsw-alias-label-tertiary);margin:0;font-size:13px;line-height:20px}',
      '.edh-mcp-head{justify-content:flex-end;align-items:center;display:flex}',
      '.edh-mcp-list{flex-direction:column;margin:0;padding:0;list-style:none;display:flex}',
      '.edh-mcp-row{border-bottom:.5px solid var(--dsw-alias-border-l2);grid-template-columns:minmax(0,1fr) max-content 44px max-content;align-items:center;gap:4px 16px;padding:10px 0;display:grid}',
      '.edh-mcp-ident{align-items:center;gap:8px;min-width:0;display:flex}',
      '.edh-mcp-name{text-overflow:ellipsis;white-space:nowrap;overflow:hidden;font-size:14px;line-height:22px}',
      '.edh-mcp-badge{color:var(--dsw-alias-label-tertiary);border:.5px solid var(--dsw-alias-border-l3);border-radius:999px;flex:none;padding:0 6px;font-size:11px;line-height:18px}',
      '.edh-mcp-state{color:var(--dsw-alias-label-secondary);align-items:center;gap:6px;white-space:nowrap;display:flex;font-size:12px;line-height:18px}',
      '.edh-mcp-dot{border-radius:50%;flex:none;background:currentColor;width:6px;height:6px;display:inline-block}',
      '.edh-mcp-dot[data-tone=ok]{color:var(--dsw-alias-state-success-primary)}',
      '.edh-mcp-dot[data-tone=busy]{color:var(--dsw-alias-state-warn-primary)}',
      '.edh-mcp-dot[data-tone=bad]{color:var(--dsw-alias-state-error-primary)}',
      '.edh-mcp-dot[data-tone=off]{color:var(--dsw-alias-state-idle-primary)}',
      '.edh-mcp-count{color:var(--dsw-alias-label-secondary);text-align:right;font-size:13px;line-height:20px;font-variant-numeric:tabular-nums}',
      '.edh-mcp-actions{justify-content:flex-end;align-items:center;gap:2px;display:flex}',
      '.edh-mcp-button{box-sizing:border-box;color:var(--dsw-alias-label-secondary);cursor:pointer;background:0 0;border:none;border-radius:var(--dsw-radius-sm);justify-content:center;align-items:center;gap:4px;height:28px;padding:0 10px;font:inherit;font-size:12px;line-height:18px;white-space:nowrap;display:inline-flex}',
      '.edh-mcp-button-sm{height:24px;padding:0 8px}',
      '.edh-mcp-button:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover)}',
      '.edh-mcp-button:active:not(:disabled){background:var(--dsw-alias-interactive-bg-active)}',
      '.edh-mcp-button:disabled{cursor:not-allowed;opacity:.4}',
      '.edh-mcp-button[data-danger]:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover-danger);color:var(--dsw-alias-state-error-primary)}',
      '.edh-mcp-button-primary{background:var(--dsw-alias-button-primary-fill);color:var(--dsw-alias-label-primary-foreground)}',
      '.edh-mcp-button-primary:hover:not(:disabled){background:var(--dsw-alias-button-primary-hover)}',
      '.edh-mcp-failure{color:var(--dsw-alias-state-error-primary);grid-column:1/-1;margin:0;font-size:12px;line-height:18px}',
      '.edh-mcp-notice{color:var(--dsw-alias-label-secondary);margin:0;font-size:12px;line-height:18px}',
      '.edh-mcp-notice[data-tone=bad]{color:var(--dsw-alias-state-error-primary)}',
      '.edh-mcp-panel{box-sizing:border-box;background:var(--dsw-alias-settings-card-fill);border:.5px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-lg);flex-direction:column;gap:10px;padding:14px;display:flex}',
      '.edh-mcp-seg{background:var(--dsw-alias-bg-layer-2);border-radius:var(--dsw-radius-sm);align-self:flex-start;align-items:center;gap:2px;padding:2px;display:inline-flex}',
      '.edh-mcp-segOption{color:var(--dsw-alias-label-secondary);cursor:pointer;background:0 0;border:none;border-radius:var(--dsw-radius-xs);height:24px;padding:0 10px;font:inherit;font-size:12px;line-height:18px}',
      '.edh-mcp-segOption[aria-pressed=true]{background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);box-shadow:var(--dsw-shadow-lv1)}',
      '.edh-mcp-field{flex-direction:column;gap:4px;display:flex}',
      '.edh-mcp-fieldLabel{color:var(--dsw-alias-label-secondary);font-size:12px;line-height:18px}',
      '.edh-mcp-input{box-sizing:border-box;width:100%;min-height:28px;margin:0;padding:3px 8px;border:.5px solid var(--dsw-alias-border-l4);border-radius:var(--dsw-radius-sm);outline:none;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font:inherit;font-size:13px;line-height:20px}',
      '.edh-mcp-input::placeholder{color:var(--dsw-alias-label-dimmed)}',
      '.edh-mcp-textarea{resize:vertical;min-height:56px}',
      '.edh-mcp-panelActions{gap:8px;display:flex}',
      '.edh-mcp :is(button,input,textarea):focus-visible{outline:var(--dsw-focus-ring-width) solid var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary));outline-offset:2px}',
      '@media (prefers-reduced-motion:no-preference){',
      '.edh-mcp-panel{animation:edh-mcp-enter 120ms ease-out}',
      '@keyframes edh-mcp-enter{from{opacity:0;transform:translateY(-2px)}to{opacity:1;transform:none}}',
      '}',
    ].join('')

    /** Install the MCP page stylesheet once and take it back out on dispose. */
    function installMcpStyles() {
      if (typeof document === 'undefined') return () => {}
      const selector = 'style[data-edh-css="mcp"]'
      if (document.querySelector(selector) === null) {
        const tag = document.createElement('style')
        tag.dataset.edhCss = 'mcp'
        tag.dataset.plugin = '@moreweb/edh'
        tag.textContent = MCP_CSS
        document.head.appendChild(tag)
        return () => {
          if (tag.parentNode !== null) tag.parentNode.removeChild(tag)
        }
      }
      return () => {
        const existing = document.querySelector(selector)
        if (existing !== null && existing.parentNode !== null) existing.parentNode.removeChild(existing)
      }
    }

    /**
     * Shadowing priority for a keyed slot entry.
     *
     * A keyed slot refuses a second entry for the same `key` at the *same*
     * priority — it throws instead of replacing. Entries are kept sorted by
     * priority ascending and the first entry per key is the one that renders, so
     * a shadow registers below the shipped entry's implicit priority 0.
     */
    const SHADOW_PRIORITY = -1

    /** Required services: slot registry, locale, and the Plugin Manager Remote face. */
    const inject = ['slots', 'locale', 'remote', 'remote.pluginManager']

    /**
     * Mount the EDH master switch and the surfaces it governs.
     * @param ctx - the browser plugin context.
     */
    function apply(ctx) {
      const t = ctx.locale.bind(NS)
      ctx.effect(() => ctx.locale.register(NS, { en, zh }), 'edh: dictionary')

      const controller = createController(ctx.remote.pluginManager)
      void controller.refresh()

      ctx.effect(() => {
        const disposeChanged = ctx.remote.$on('plugin-manager/changed', () => {
          void controller.refresh()
        })
        return () => {
          disposeChanged()
        }
      }, 'edh: host invalidation')

      const Switch = createSwitch(t, controller)
      // The right-aligned header utilities row is the seat this build paints.
      // `conversation.header.leading` is declared but never rendered here.
      ctx.slots.inject('conversation.session.header.utilities', () => ctx.slots.register({
        name: 'conversation.session.header.utilities',
        id: 'edh',
        order: -20,
        label: () => t('label'),
      }, Switch))

      // export — one download action beside the switch. It carries its own row's
      // enablement, so pausing the feature removes the action without touching
      // the switch that paused it.
      const ExportButton = createExportButton(t, controller)
      ctx.slots.inject('conversation.session.header.utilities', () => {
        try {
          return ctx.slots.register({
            name: 'conversation.session.header.utilities',
            id: 'edh-export',
            order: -10,
            locale: NS,
            label: () => t('export'),
          }, ExportButton)
        } catch (error) {
          exportWrite({ phase: 'register-failed', message: String(error?.message ?? error) })
          throw error
        }
      })

      // update — one action in Plugin Manager, on EDH's own detail page only. It
      // checks the published version on mount and applies it on click; applying
      // then hands the bundle back to the client module system so the new
      // browser half runs without a page reload.
      /** Filled by the optional `modules` scope; absent when the page has none. */
      const reloader = { current: undefined }
      const UpdateControl = createUpdateControl(t, controller, reloader)
      ctx.slots.inject('plugins.detail.actions', () => {
        try {
          return ctx.slots.register({
            name: 'plugins.detail.actions',
            id: 'edh-update',
            order: 10,
            locale: NS,
            label: () => t('update'),
          }, UpdateControl)
        } catch (error) {
          updateWrite({ phase: 'register-failed', message: String(error?.message ?? error) })
          throw error
        }
      })

      // reload — the same row, immediately to the right of update, because the
      // two are one errand: bring a version in, then load the interface that is
      // installed. It is its own entry rather than part of the update control so
      // it is not gated on the update row: it asks the module system for a new
      // revision of what is already here, which is not the update route.
      const ReloadControl = createReloadControl(t, reloader)
      ctx.slots.inject('plugins.detail.actions', () => {
        try {
          return ctx.slots.register({
            name: 'plugins.detail.actions',
            id: 'edh-reload',
            order: 11,
            locale: NS,
            label: () => t('reload'),
          }, ReloadControl)
        } catch (error) {
          updateWrite({ phase: 'register-failed', message: String(error?.message ?? error) })
          throw error
        }
      })

      // mcp — its own page in the Settings navigation. It is a section, not a
      // tab under Plugins: servers are not part of the plugin inventory, and a
      // page found only after opening a page someone else opened is buried.
      //
      // The nav entry is gated on the row, unlike a tab: a section that leads to
      // an empty page is worse than no entry, so nothing is registered while the
      // row is missing or off. That state is not known at apply time — the row
      // list is still being read — so the entry is registered from the
      // controller's own state and re-synced on every change. The settings nav
      // redraws from `ctx.slots.entries` on each register and dispose, so the
      // cell appears and disappears with the row instead of pinning a dead link.
      const McpPage = createMcpPage(t, controller)
      ctx.effect(() => installMcpStyles(), 'edh: mcp styles')
      ctx.slots.inject(MCP_SECTION_SLOT, () => {
        let dispose
        let installed = false
        /** Register, dispose, or leave alone, to match the row right now. */
        const sync = () => {
          const wanted = rowEnabled(controller.getSnapshot(), MCP_MODULE)
          if (wanted === installed) return
          if (!wanted) {
            installed = false
            dispose?.()
            dispose = undefined
            return
          }
          try {
            dispose = ctx.slots.register({
              name: MCP_SECTION_SLOT,
              id: 'mcp',
              order: MCP_SECTION_ORDER,
              locale: NS,
              label: () => t('mcpNav'),
            }, McpPage)
            installed = true
          } catch (error) {
            // This runs from the controller's own listener, so a throw would
            // surface as a failed row read and take the switch with it. Record
            // it and stay uninstalled: no nav cell, nothing half-mounted.
            installed = false
            mcpWrite({ phase: 'register-failed', message: String(error?.message ?? error) })
          }
        }
        const stopWatching = controller.subscribe(sync)
        sync()
        return () => {
          stopWatching()
          dispose?.()
          dispose = undefined
        }
      })

      // The reload face is optional: without `modules` both controls still check
      // and apply, and the Reload button is simply not offered rather than
      // present-and-failing. The face is shared because the update control's
      // live path and the Reload button replace the same browser half; the
      // caller supplies the breadcrumb writer of the surface it speaks for, and
      // there is only one surface now, so both write `edh:update`.
      ctx.inject(['modules'], scope => {
        scope.effect(() => {
          reloader.current = log => reloadBrowserHalf(scope.modules, log)
          return () => {
            reloader.current = undefined
          }
        }, 'edh: update reload')
      })

      // edit — replace the `user` Chat renderer so a user message gains an Edit
      // action, and seed the fork's composer from the click. It mounts on its own
      // dependency scope: if Session control ever goes away, the control surface
      // above must keep working, so this never joins the required service list.
      ctx.inject(['sessions', 'uiWorkspace'], scope => {
        try {
          ctx.effect(() => installEditStyles(), 'edh: edit styles')
          const UserMessageView = createUserMessageView(t, controller, scope)
          // `priority` is what makes this a shadow rather than a collision: the
          // shipped `user` entry sits at the implicit priority 0, a keyed slot
          // throws on a duplicate key at the same priority, and the lowest
          // priority is the one that renders.
          //
          // Slot callbacks run after this scope body, so their failures are not
          // caught here — each one records its own breadcrumb instead.
          ctx.slots.inject('conversation.chat.node', () => {
            try {
              const dispose = ctx.slots.register({
                name: 'conversation.chat.node',
                key: 'user',
                priority: SHADOW_PRIORITY,
                locale: NS,
              }, UserMessageView)
              editWrite({ phase: 'shadowed', priority: SHADOW_PRIORITY })
              return dispose
            } catch (error) {
              editWrite({ phase: 'shadow-failed', message: String(error?.message ?? error) })
              throw error
            }
          })
          ctx.slots.inject('conversation.input.dock', () => ctx.slots.register({
            name: 'conversation.input.dock',
            id: 'edh-edit',
            order: -100,
            locale: NS,
          }, PendingEditConsumer))
        } catch (error) {
          editWrite({ phase: 'register-failed', message: String(error?.message ?? error) })
        }
      })
    }

    const exports = { apply, inject }
    // Exposed for the Node test that exercises the controller against fake Remotes.
    exports.__test = {
      createController,
      createSwitch,
      findFeatures,
      featureEnabled,
      contentParts,
      formatClock,
      unwrap,
      rowEnabled,
      updateSubject,
      readCheck,
      readApply,
      updateText,
      failureNote,
      revisionOfFrame,
      eventFrames,
      moduleRevision,
      failureText,
      serverRecord,
      actionReport,
      reasonSentence,
      inputRejection,
      readMcpView,
      serverState,
      stateLabel,
      stateTone,
      emptyServerForm,
      splitLines,
      environmentMap,
      isHttpUrl,
      defaultServerName,
      validateServer,
      addServerBody,
      serverActionBody,
      withoutKey,
      reloadVisible,
      hostStaleness,
      reloadOutcome,
      reloadText,
      runReload,
      icon,
      controlStyle,
      ICON_UPDATE,
      ICON_RELOAD,
      NS,
      EDIT_MODULE,
      EXPORT_MODULE,
      UPDATE_MODULE,
      MCP_MODULE,
      PACKAGE_NAME,
      UPDATE_ROUTE,
      EVENTS_ROUTE,
      MCP_ROUTE,
      MCP_SECTION_SLOT,
      MCP_SECTION_ORDER,
      MCP_ACTIONS,
      UPDATE_DEBUG_KEY,
      MCP_DEBUG_KEY,
    }

    return exports
  },
})
