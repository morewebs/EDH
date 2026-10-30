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
    /** The row that carries the side-chat commands; the browser half reads its enablement. */
    const BTW_MODULE = '@moreweb/edh/btw'
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
      btwLabel: 'Side chat',
      btwDescription: 'Open a side chat that carries this conversation. It takes no arguments.',
      btwTitle: 'Side: {title}',
      btwGuide: 'Ask something tangential without leaving this conversation.',
      mcpNav: 'MCP servers',
      mcpTitle: 'MCP servers',
      mcpIntro: 'Connect a server once and every session can use its tools.',
      mcpLoading: 'Reading servers…',
      mcpLoadFailed: 'The server list could not be read.',
      reloadLabel: 'Reload',
      reloadDescription: 'Refresh the MCP servers and skills the model can see. It takes no arguments.',
      reloadMcpOk: 'Refreshed {servers} servers.',
      reloadMcpFailed: 'The MCP servers could not be refreshed.',
      reloadSkillsOk: 'Refreshed {skills} skills.',
      reloadSkillsFailed: 'The skill list could not be refreshed.',
      reloadSomeFailed: '{failed} did not reconnect.',
      reloadNoService: 'This build has no refresh service yet. Restart the app to pick it up.',
      reloadSkipped: 'A reload is already running.',      mcpReload: 'Reload',
      mcpReloading: 'Reloading…',
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
      remoteNav: 'Remote',
      remoteTitle: 'Remote access',
      remoteIntro: 'Publish this GUI to your phone over the local network.',
      remoteLoading: 'Loading…',
      remoteLoadFailed: 'The remote settings could not be read.',
      remoteRetry: 'Retry',
      remoteOff: 'Remote access is off. Turn it on with the EDH switch.',
      remoteUnavailable: 'This profile has no remote services, so there is nothing to publish here.',
      remoteStateOff: 'Off',
      remoteStateStarting: 'Starting',
      remoteStateListening: 'Listening',
      remoteStateFailed: 'Failed',
      remoteStart: 'Start',
      remoteStop: 'Stop',
      remotePort: 'Port',
      remotePortHint: '1 to 65535.',
      remotePortInvalid: 'Enter a port number.',
      remotePortRange: 'Use a port from 1 to 65535.',
      remotePortInUse: 'That port is already in use. Pick another.',
      remoteUsername: 'User name',
      remoteUsernameRequired: 'Enter a user name.',
      remoteUsernameInvalid: 'Use at most 64 characters.',
      remotePassword: 'Password',
      remotePasswordConfirm: 'Confirm password',
      remotePasswordHint: 'Changing the password signs out the phone.',
      remotePasswordRequired: 'Set a password before the server starts.',
      remotePasswordShort: 'Use at least 8 characters.',
      remotePasswordMismatch: 'The two passwords do not match.',
      remoteSave: 'Save',
      remoteSaving: 'Saving…',
      remoteSaved: 'Saved',
      remoteAccount: 'Remote sign-in',
      remoteAddresses: 'Addresses',
      remoteAddressesHint: 'Open one of these on your phone.',
      remoteAddressesWaiting: 'Start the server to get an address.',
      remotePlainHttp: 'Plain HTTP is the trade: one address and no certificate, but the connection is not encrypted and your password crosses the network in clear text. Use it on a network you trust.',
      remoteSignOut: 'Sign out all devices',
      remoteSignOutHint: 'Closes every phone that is signed in.',
      remoteSessions: 'Phones signed in: {count}',
      remoteSessionOne: '1 phone signed in',
      remoteNoSessions: 'No phone signed in',
      skillsNav: 'Skills',
      skillsTitle: 'Skills',
      skillsIntro: 'The skills this Harness can use, global and per project.',
      skillsTabGlobal: 'Global',
      skillsTabWorkspace: 'This workspace',
      skillsFilter: 'Filter skills',
      skillsFilterPlaceholder: 'Filter by name or description',
      skillsRefresh: 'Refresh',
      skillsLoading: 'Reading skills…',
      skillsFailed: 'The skill list could not be read.',
      skillsRetry: 'Retry',
      skillsUnavailable: 'Skills are unavailable: this build has no skill service.',
      skillsEmptyGlobal: 'No global skills are installed.',
      skillsEmptyWorkspace: 'No skills in this workspace yet. Add one under .agents/skills in the project.',
      skillsScopeSession: 'from the open conversation',
      skillsScopeRecent: 'from the most recent conversation',
      skillsScopeDefault: 'default workspace',
      skillsWorkspaceLine: 'Workspace: {name}',
      skillsNoWorkspace: 'No workspace resolved yet',
      skillsUserOnly: 'user only',
      skillsCopyPath: 'Copy path',
      skillsIncomplete: 'Some skill providers could not be read.',
      searchOpen: 'Search',
      searchPlaceholder: 'Search sessions and messages, or ask the agent',
      searchEsc: 'Esc',
      searchAskIdle: 'Ask the agent to find this conversation',
      searchAskEmpty: 'Ask the agent what you were working on',
      searchAskSearching: 'Searching your conversations…',
      searchAskReading: 'Reading your conversations…',
      searchAskCancel: 'Cancel',
      searchAskAgain: 'Ask again',
      searchAskMessages: 'Search messages instead',
      searchAskNone: 'The agent did not find a conversation for that.',
      searchAskFailed: 'The agent could not search your conversations.',
      searchAskTimeout: 'The agent took too long and gave up.',
      searchAskTooShort: 'Type a few more words first.',
      searchAskRestart: 'This build does not have the ask service yet. Restart the app, then try again.',
      searchAskUnexpected: 'The ask service answered unexpectedly. Try again in a moment.',
      searchAskNoIndex: 'Your conversation index has not been built yet. It builds in the background after a restart; search messages meanwhile.',
      searchAskNoModel: 'No model is configured, so the agent cannot search for you. Set one in the harness settings.',
      searchAskBusy: 'One search is already running. Give it a moment.',
      searchAskUnavailable: 'The agent is not available in this build.',
      searchChatRetry: 'Retry',
      searchChatSection: 'Chat',
      searchSessionsSection: 'Sessions',
      searchMessagesSection: 'Messages',
      searchActionsSection: 'Actions',
      searchSearching: 'Searching…',
      searchNoMessages: 'No messages match',
      searchNoSessions: 'No session titles match',
      searchRetry: 'Search again',
      searchIndexing: 'Indexing {ready} of {total} sessions',
      searchTruncated: 'refine to see more',
      searchHintMove: '↑↓ to move',
      searchHintOpen: 'Enter to open',
      searchHintClose: 'Esc to close',
      searchActionSettings: 'Open Settings',
      searchActionSidebar: 'Toggle the sidebar',
      searchActionConversation: 'Show the conversation',
      notifyTitle: 'Notifications',
      notifyIntro: 'A sound when a turn finishes while you are looking somewhere else.',
      notifyOff: 'Notifications are off. Turn them on with the EDH switch.',
      notifyEnable: 'Notify me',
      notifyEnableHint: 'Play a sound when a turn finishes.',
      notifyBackground: 'Only when this window is in the background',
      notifyBackgroundHint: 'Off means it also plays while you are reading the conversation.',
      notifySound: 'Sound',
      notifySoundHint: 'Pick one and press Play to hear it.',
      notifyPlay: 'Play',
      notifyWindows: 'Windows',
      notifyWindowsSoundHint: 'A sound from Windows itself.',
      notifyWindowsMissing: 'The Windows sounds are not on this machine.',
      notifyCatalogFailed: 'The Windows sound list could not be read.',
      notifyVolume: 'Volume',
      notifyVolumeHint: 'How loud the notification is.',
      notifyTest: 'Test',
      notifyTestHint: 'Hear the chosen sound now, and allow popups if this browser offers them.',
      notifyTestAction: 'Test',
      notifyTestDone: 'That is the sound, and a popup.',
      notifyTestSoundOnly: 'That is the sound. This browser did not show a popup.',
      notifyPopupDenied: 'That is the sound. Popups are blocked for this page.',
      notifyPlayFailed: 'That sound could not be played.',
      notifyPlainHttp: 'Popups need a secure (https) page, and this one is served over plain http, so on the phone you get the sound rather than a system notification. Here on the desktop, press Test once to allow popups.',
      notifyToneChime: 'Chime',
      notifyToneChimeHint: 'A soft bell.',
      notifyToneTwo: 'Two-tone',
      notifyToneTwoHint: 'Two notes, rising.',
      notifyToneBlip: 'Blip',
      notifyToneBlipHint: 'One short note.',
      notifyTitleFallback: 'Session finished',
      notifyBodyFallback: 'The turn finished. Open it to read the result.',
      notifyPopupTitle: 'Turn finished',
      notifyPopupBody: 'The conversation is ready.',
      remotePhoneHint: 'The phone must be on the same network as this computer.',
      remoteQrShow: 'Show code',
      remoteQrHide: 'Hide code',
      remoteQrLabel: 'QR code for {address}',
      remoteActionFailed: 'That change did not save. Try again, and check the port.',
      remoteSignedOut: 'Every phone was signed out.',
      usageNav: 'Usage',
      usageTitle: 'Usage',
      usageIntro: 'Token usage across every session, bucketed by day in {zone}.',
      usageIntroPlain: 'Token usage across every session.',
      usageZoneUnknown: 'the local time zone',
      usageLoading: 'Reading usage…',
      usageLoadFailed: 'The usage data could not be read.',
      usageRetry: 'Retry',
      usageOff: 'Usage is off. Turn it on with the EDH switch.',
      usageUnavailable: 'This profile has no usage services, so there is nothing to count here.',
      usageEmpty: 'No token usage has been recorded yet.',
      usageEmptyRange: 'No usage in this range.',
      usageRebuild: 'Read history again',
      usageStatTotal: 'Total tokens',
      usageStatTotalNote: '{messages} messages in {sessions} sessions',
      usageStatPeak: 'Peak day',
      usageStatPeakNote: 'No peak day yet',
      usageStatLongest: 'Longest session',
      usageStatLongestNote: 'No session recorded yet',
      usageStatStreak: 'Current streak',
      usageStatLongestStreak: 'Longest streak',
      usageDays: '{count} days',
      usageDaysOne: '1 day',
      usageDaysNone: '0 days',
      usageTrendTitle: 'Daily token trend',
      usageModelsTitle: 'Model usage',
      usageTokens: 'tokens',
      usageRangeNote: 'Daily buckets by calendar day. Weekly sums each week from Monday. Cumulative adds every day up to that point.',
      usageRangeLabel: 'Range',
      usageRangeDaily: 'Daily',
      usageRangeWeekly: 'Weekly',
      usageRangeCumulative: 'Cumulative',
      usageScopeLabel: 'Sessions',
      usageScopeAll: 'All sessions',
      usageScopeMain: 'Main sessions only',
      usageScopeNote: 'The Host counts every session together and sends no main and subagent split, so this filter cannot narrow the numbers yet.',
      usageRefresh: 'Refresh',
      usageRefreshing: 'Refreshing…',
      usageBackfill: 'Reading history… {done} of {total}',
      usageUpdated: 'Updated {time}',
      usageOther: 'Other',
      usageChartLabel: '{range} token trend, {from} to {to}, {models}.',
      usageChartLabelOne: 'one model',
      usageChartLabelMany: '{count} models',
      usageDonutLabel: 'Model share, {models}. {total} tokens in total.',
      usageDonutCentre: 'tokens',
      usageDurationZero: '0m',
      usageDurationMinutes: '{minutes}m',
      usageDurationHours: '{hours}h {minutes}m',
      usageUnitSmall: 'K',
      usageUnitMid: 'M',
      usageUnitBig: 'B',
      usageActionFailed: 'That change did not save. Try again.',
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
      btwLabel: '旁支对话',
      btwDescription: '打开一个携带当前对话的旁支对话。它不接受参数。',
      btwTitle: '旁支：{title}',
      btwGuide: '问点题外的话，不必离开当前对话。',
      mcpNav: 'MCP 服务器',
      mcpTitle: 'MCP 服务器',
      mcpIntro: '连接一次服务器，之后每个会话都能使用它的工具。',
      mcpLoading: '正在读取服务器…',
      mcpLoadFailed: '无法读取服务器列表。',
      reloadLabel: '重新载入',
      reloadDescription: '刷新模型能看到的 MCP 服务器与技能。此命令不接受参数。',
      reloadMcpOk: '已刷新 {servers} 个服务器。',
      reloadMcpFailed: 'MCP 服务器未能刷新。',
      reloadSkillsOk: '已刷新 {skills} 个技能。',
      reloadSkillsFailed: '技能列表未能刷新。',
      reloadSomeFailed: '其中 {failed} 个没有重新连接。',
      reloadNoService: '这个构建还没有刷新服务。请重启应用以启用。',
      reloadSkipped: '已经有一个重新载入在运行。',      mcpReload: '重新载入',
      mcpReloading: '正在重新载入…',
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
      remoteNav: '远程访问',
      remoteTitle: '远程访问',
      remoteIntro: '在本地区域网上把这个界面发布到手机上。',
      remoteLoading: '正在读取…',
      remoteLoadFailed: '无法读取远程设置。',
      remoteRetry: '重试',
      remoteOff: '远程访问已关闭，请用 EDH 开关打开。',
      remoteUnavailable: '当前配置没有远程服务，这里没有可发布的东西。',
      remoteStateOff: '已关闭',
      remoteStateStarting: '正在启动',
      remoteStateListening: '正在监听',
      remoteStateFailed: '失败',
      remoteStart: '启动',
      remoteStop: '停止',
      remotePort: '端口',
      remotePortHint: '1 到 65535。',
      remotePortInvalid: '请填写端口号。',
      remotePortRange: '端口请使用 1 到 65535。',
      remotePortInUse: '该端口已被占用，请换一个。',
      remoteUsername: '用户名',
      remoteUsernameRequired: '请填写用户名。',
      remoteUsernameInvalid: '最多 64 个字符。',
      remotePassword: '密码',
      remotePasswordConfirm: '确认密码',
      remotePasswordHint: '修改密码会让手机退出登录。',
      remotePasswordRequired: '请先设置密码，再启动服务器。',
      remotePasswordShort: '至少 8 个字符。',
      remotePasswordMismatch: '两次输入的密码不一致。',
      remoteSave: '保存',
      remoteSaving: '正在保存…',
      remoteSaved: '已保存',
      remoteAccount: '远程登录',
      remoteAddresses: '地址',
      remoteAddressesHint: '在手机上打开下面任意一个地址。',
      remoteAddressesWaiting: '启动服务器后会显示地址。',
      remotePlainHttp: '明文 HTTP 是有意的取舍：只有一个地址、不用证书，但连接不加密，密码会以明文经过网络。请只在信任的网络上使用。',
      remoteSignOut: '退出所有设备',
      remoteSignOutHint: '已登录的手机都会退回登录页。',
      remoteSessions: '已登录手机：{count} 台',
      remoteSessionOne: '已登录 1 台手机',
      remoteNoSessions: '没有手机登录',
      skillsNav: '技能',
      skillsTitle: '技能',
      skillsIntro: '这个 Harness 可用的技能，分全局与每个项目。',
      skillsTabGlobal: '全局',
      skillsTabWorkspace: '此工作区',
      skillsFilter: '筛选技能',
      skillsFilterPlaceholder: '按名称或描述筛选',
      skillsRefresh: '刷新',
      skillsLoading: '正在读取技能…',
      skillsFailed: '无法读取技能列表。',
      skillsRetry: '重试',
      skillsUnavailable: '技能不可用：这个构建没有技能服务。',
      skillsEmptyGlobal: '没有安装全局技能。',
      skillsEmptyWorkspace: '这个工作区还没有技能。请在项目的 .agents/skills 下添加一个。',
      skillsScopeSession: '来自打开的对话',
      skillsScopeRecent: '来自最近一次的对话',
      skillsScopeDefault: '默认工作区',
      skillsWorkspaceLine: '工作区：{name}',
      skillsNoWorkspace: '还没有解析出工作区',
      skillsUserOnly: '仅用户',
      skillsCopyPath: '复制路径',
      skillsIncomplete: '部分技能来源读取失败。',
      searchOpen: '搜索',
      searchPlaceholder: '搜索会话与消息，或直接问 agent',
      searchEsc: 'Esc',
      searchAskIdle: '让 agent 找出这段对话',
      searchAskEmpty: '问 agent 你之前在做哪件事',
      searchAskSearching: '正在检索你的对话…',
      searchAskReading: '正在阅读你的对话…',
      searchAskCancel: '取消',
      searchAskAgain: '再问一次',
      searchAskMessages: '改为搜索消息',
      searchAskNone: 'agent 没有找到对应的对话。',
      searchAskFailed: 'agent 无法检索你的对话。',
      searchAskTimeout: 'agent 花的时间太长，放弃了。',
      searchAskTooShort: '再多输入几个词。',
      searchAskRestart: '这个构建还没有 ask 服务。请重启应用后再试。',
      searchAskUnexpected: 'ask 服务返回了意料之外的响应。请先停用应用的 Remote 页面再试。',
      searchAskNoIndex: '对话索引还没有建好。重启后它会在后台构建；期间可以先用消息搜索。',
      searchAskNoModel: '没有配置模型，agent 无法替你检索。请在 harness 设置里选择一个。',
      searchAskBusy: '已经有一个检索在运行，稍等一下。',
      searchAskUnavailable: '这个构建里没有 agent。',
      searchChatRetry: '重试',
      searchChatSection: '对话',
      searchSessionsSection: '会话',
      searchMessagesSection: '消息',
      searchActionsSection: '操作',
      searchSearching: '正在搜索…',
      searchNoMessages: '没有匹配的消息',
      searchNoSessions: '没有匹配的会话标题',
      searchRetry: '重新搜索',
      searchIndexing: '正在索引第 {ready} / {total} 个会话',
      searchTruncated: '缩小范围查看更多',
      searchHintMove: '↑↓ 移动',
      searchHintOpen: 'Enter 打开',
      searchHintClose: 'Esc 关闭',
      searchActionSettings: '打开设置',
      searchActionSidebar: '显示或隐藏侧边栏',
      searchActionConversation: '回到对话',
      notifyTitle: '通知',
      notifyIntro: '当你看别处时，一轮对话结束后播放提示音。',
      notifyOff: '通知已关闭，请用 EDH 开关打开。',
      notifyEnable: '通知我',
      notifyEnableHint: '一轮对话结束时播放提示音。',
      notifyBackground: '仅当这个窗口在后台时',
      notifyBackgroundHint: '关闭后，你正在看对话时也会播放。',
      notifySound: '提示音',
      notifySoundHint: '选一个，按「播放」试听。',
      notifyPlay: '播放',
      notifyWindows: 'Windows',
      notifyWindowsSoundHint: '来自 Windows 本身的音效。',
      notifyWindowsMissing: '这台机器上没有 Windows 音效。',
      notifyCatalogFailed: '无法读取 Windows 音效列表。',
      notifyVolume: '音量',
      notifyVolumeHint: '提示音的音量。',
      notifyTest: '测试',
      notifyTestHint: '立刻听一下所选提示音，并在浏览器支持时允许弹窗。',
      notifyTestAction: '测试',
      notifyTestDone: '就是这个提示音，并弹出了一条通知。',
      notifyTestSoundOnly: '就是这个提示音。这个浏览器没有弹出通知。',
      notifyPopupDenied: '就是这个提示音。本页的弹窗被阻止了。',
      notifyPlayFailed: '无法播放这个提示音。',
      notifyPlainHttp: '弹窗需要安全的（https）页面，而本页通过明文 http 提供，所以在手机上你听到的是提示音而不是系统通知。在桌面端，按一次「测试」即可允许弹窗。',
      notifyToneChime: '钟声',
      notifyToneChimeHint: '柔和的一声钟响。',
      notifyToneTwo: '双音',
      notifyToneTwoHint: '两个音，上行。',
      notifyToneBlip: '短哔',
      notifyToneBlipHint: '一个短促的音。',
      notifyTitleFallback: '会话已结束',
      notifyBodyFallback: '这一轮已结束，打开对话查看结果。',
      notifyPopupTitle: '对话已结束',
      notifyPopupBody: '这轮对话已就绪。',
      remotePhoneHint: '手机必须和这台电脑在同一个网络上。',
      remoteQrShow: '显示二维码',
      remoteQrHide: '隐藏二维码',
      remoteQrLabel: '{address} 的二维码',
      remoteActionFailed: '改动未保存。请重试，并检查端口。',
      remoteSignedOut: '所有设备已退出。',
      usageNav: '用量',
      usageTitle: '用量',
      usageIntro: '每个会话的 token 用量，按 {zone} 分区按天统计。',
      usageIntroPlain: '每个会话的 token 用量。',
      usageZoneUnknown: '本地时区',
      usageLoading: '正在读取用量…',
      usageLoadFailed: '无法读取用量数据。',
      usageRetry: '重试',
      usageOff: '用量已关闭，请用 EDH 开关打开。',
      usageUnavailable: '当前配置没有用量服务，这里没有可统计的内容。',
      usageEmpty: '还没有记录到 token 用量。',
      usageEmptyRange: '这个范围内没有用量。',
      usageRebuild: '重新读取历史',
      usageStatTotal: '总 token',
      usageStatTotalNote: '{sessions} 个会话，{messages} 条消息',
      usageStatPeak: '峰值日',
      usageStatPeakNote: '还没有峰值日',
      usageStatLongest: '最长会话',
      usageStatLongestNote: '还没有记录会话',
      usageStatStreak: '当前连续天数',
      usageStatLongestStreak: '最长连续天数',
      usageDays: '{count} 天',
      usageDaysOne: '1 天',
      usageDaysNone: '0 天',
      usageTrendTitle: '每日 token 趋势',
      usageModelsTitle: '模型用量',
      usageTokens: 'token',
      usageRangeNote: '按天是自然日；按周从周一开始汇总；累计是从头加到当天。',
      usageRangeLabel: '范围',
      usageRangeDaily: '按天',
      usageRangeWeekly: '按周',
      usageRangeCumulative: '累计',
      usageScopeLabel: '会话',
      usageScopeAll: '全部会话',
      usageScopeMain: '仅主会话',
      usageScopeNote: '宿主把全部会话统计在一起，也没有给出主会话与子代理的拆分，所以这个筛选暂时无法收窄数字。',
      usageRefresh: '刷新',
      usageRefreshing: '正在刷新…',
      usageBackfill: '正在读取历史… {done}/{total}',
      usageUpdated: '更新于 {time}',
      usageOther: '其他',
      usageChartLabel: '{range} token 趋势，{from} 至 {to}，{models}。',
      usageChartLabelOne: '1 个模型',
      usageChartLabelMany: '{count} 个模型',
      usageDonutLabel: '模型占比，{models}。共 {total} token。',
      usageDonutCentre: 'token',
      usageDurationZero: '0 分钟',
      usageDurationMinutes: '{minutes} 分钟',
      usageDurationHours: '{hours} 小时 {minutes} 分',
      usageUnitSmall: '万',
      usageUnitMid: '亿',
      usageUnitBig: '万亿',
      usageActionFailed: '改动未保存，请重试。',
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
    /** Separate breadcrumb for the remote-access page. */
    const REMOTE_DEBUG_KEY = 'edh:remote'
    /** Separate breadcrumb for the usage page. */
    const USAGE_DEBUG_KEY = 'edh:usage'
    /** Separate breadcrumb for the mobile layer. */
    const MOBILE_DEBUG_KEY = 'edh:mobile'
    /** Separate breadcrumb for the side-chat commands. */
    const BTW_DEBUG_KEY = 'edh:btw'

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

    function remoteWrite(payload) {
      writeBreadcrumb(REMOTE_DEBUG_KEY, payload)
    }

    function usageWrite(payload) {
      writeBreadcrumb(USAGE_DEBUG_KEY, payload)
    }

    function notifyWrite(payload) {
      writeBreadcrumb(NOTIFY_DEBUG_KEY, payload)
    }

    function mobileWrite(payload) {
      writeBreadcrumb(MOBILE_DEBUG_KEY, payload)
    }

    function btwWrite(payload) {
      writeBreadcrumb(BTW_DEBUG_KEY, payload)
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
     * `IconBranchOutlineRegular`, from the same shipped set.
     *
     * One trunk splitting into two nodes — the mark the sidebar's own Fork row
     * wears, which is literally what a side chat is. It is the only glyph of the
     * three that draws circles as well as paths, which is why `icon` accepts
     * shape objects and not just path data.
     */
    const ICON_SIDE = [
      'M1.01503 8.0001L5.6964 8.0001C6.41913 8.0001 6.78049 8.0001 7.12115 7.91951C7.4232 7.84804 7.71233 7.73014 7.97821 7.57C8.27809 7.38939 8.5364 7.13669 9.05303 6.63129L11.3281 4.40564',
      'M1.01221 7.9999L5.6964 7.9999C6.41913 7.9999 6.78049 7.9999 7.12115 8.08049C7.4232 8.15196 7.71233 8.26986 7.97821 8.43C8.27809 8.61061 8.5364 8.86331 9.05303 9.36871L11.3281 11.5944',
      { circle: [12.4502, 3.3079, 1.56962] },
      { circle: [12.4502, 12.6921, 1.56962] },
    ]

    /** The side-chat glyph as a component, for seats that take an icon type. */
    function SideGuideIcon(props) {
      return icon(ICON_SIDE, props?.size ?? 26)
    }

    /**
     * One shipped glyph, at the size the calling surface draws it.
     *
     * The geometry stays in its own 16 unit box and only the rendered box
     * changes, which is how the shipped components are reused at 13, 14, 22 and
     * 26px beside their own controls. Decorative by construction: the label of
     * whatever it sits in is the accessible name, so it is hidden from assistive
     * technology.
     * @param shapes - the glyph's geometry, in its 16 by 16 space: path data
     *   strings, and `{ circle: [cx, cy, r] }` for the glyphs that draw a node.
     * @param size - the rendered box in pixels.
     */
    function icon(shapes, size = 14) {
      const drawn = shapes.map(shape => (typeof shape === 'string'
        ? h('path', { key: shape, d: shape, stroke: 'currentColor' })
        : h('circle', {
          key: `circle:${shape.circle.join(',')}`,
          cx: shape.circle[0],
          cy: shape.circle[1],
          r: shape.circle[2],
          stroke: 'currentColor',
        })))
      return h('svg', {
        width: size,
        height: size,
        viewBox: '0 0 16 16',
        fill: 'none',
        strokeWidth: 1,
        'aria-hidden': 'true',
        focusable: 'false',
      }, ...drawn)
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
    /**
     * The Reload control's label: quiet text, never an icon alone.
     */
    function mcpReloadLabel(reloading, t) {
      return reloading === true ? t('mcpReloading') : t('mcpReload')
    }

    /**
     * When Reload is unavailable: while it is already running, and while a row
     * action is in flight — two requests must never race each other.
     * @param reloading - this control's own request.
     * @param busy - the page's per-row in-flight map.
     */
    function mcpReloadDisabled(reloading, busy) {
      if (reloading === true) return true
      return busy !== null && typeof busy === 'object' && Object.keys(busy).length > 0
    }

    /**
     * Fold a reload outcome into the page: a good read is adopted whole, and a
     * failure keeps the list that is already on screen.
     */
    function adoptMcpReload(current, outcome) {
      const state = current !== null && typeof current === 'object'
        ? current
        : { status: 'loading', servers: [], failure: '' }
      if (outcome !== null && typeof outcome === 'object' && outcome.ok === true && outcome.read !== undefined) {
        return { status: 'ready', servers: outcome.read.servers, failure: '', reloadFailure: '' }
      }
      return { ...state, reloadFailure: String(outcome?.failure ?? '') }
    }

    /**
     * One reload: exactly one GET, adopting the Host's own view.
     *
     * It never restarts, adds, removes or tests anything — a server the Host
     * reports as failed is simply shown as failed, which is the honest answer a
     * "re-read the list" button can give.
     * @param options - the request, the breadcrumb writer, and the state setter.
     */
    async function runMcpReload(options = {}) {
      const write = typeof options.write === 'function' ? options.write : () => {}
      const apply = typeof options.apply === 'function' ? options.apply : () => {}
      let answer
      try {
        answer = await options.request('GET')
      } catch (error) {
        const reason = messageOf(error)
        write({ phase: 'failed', action: 'reload', reason })
        const outcome = { ok: false, failure: reason }
        apply(outcome)
        return outcome
      }
      const read = readMcpView(answer)
      if (!read.ok) {
        const reason = String(answer?.reason ?? 'error')
        write({ phase: 'failed', action: 'reload', reason })
        const outcome = { ok: false, failure: read.failure }
        apply(outcome)
        return outcome
      }
      write({ phase: 'reloaded', servers: read.servers.length })
      const outcome = { ok: true, read }
      apply(outcome)
      return { ok: true, servers: read.servers.length }
    }

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
        const [reloading, setReloading] = React.useState(false)
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

        // Reload re-reads the list and its state from the Host; it changes nothing
        // the Host has not already reported.
        const reload = React.useCallback(async () => {
          if (reloading) return
          setReloading(true)
          try {
            await runMcpReload({
              request: requestMcp,
              write: mcpWrite,
              apply: outcome => setView(previous => adoptMcpReload(previous, outcome)),
            })
          } finally {
            setReloading(false)
          }
        }, [reloading])

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
          h('div', { className: 'edh-mcp-pagehead' },
            h('h2', { className: 'edh-mcp-title' }, t('mcpTitle')),
            // Reload re-reads the server list and its state from the Host. It is
            // available in every page state, including a failed row: reading is
            // exactly how you find out whether a failure is still true.
            h('button', {
              type: 'button',
              className: 'edh-mcp-reload',
              'data-busy': reloading === true,
              disabled: mcpReloadDisabled(reloading, busy),
              onClick: () => {
                void reload()
              },
            }, mcpReloadLabel(reloading, t)),
          ),
          h('p', { className: 'edh-mcp-intro' }, t('mcpIntro')),
          notice.text === '' ? null : h('p', {
            className: 'edh-mcp-notice',
            'data-tone': notice.tone,
            role: notice.tone === 'bad' ? 'alert' : 'status',
          }, notice.text),
          view.status !== 'error' && (view.reloadFailure ?? '') !== ''
            ? h('div', { className: 'edh-mcp-error', role: 'alert' },
              h('p', { className: 'edh-mcp-status' }, view.reloadFailure),
              h('button', {
                type: 'button',
                className: 'edh-mcp-button',
                onClick: () => {
                  void reload()
                },
              }, t('mcpRetry')),
            )
            : null,
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
      '.edh-mcp-pagehead{align-items:center;justify-content:space-between;gap:12px;display:flex}',
      '.edh-mcp-title{margin:0;font-size:16px;font-weight:500;line-height:24px}',
      '.edh-mcp-reload{border:.5px solid var(--dsw-alias-border-l3);border-radius:6px;background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer;flex:none;padding:0 10px;font-size:13px;line-height:22px}',
      '.edh-mcp-reload:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}',
      '.edh-mcp-reload:disabled{color:var(--dsw-alias-label-dimmed);background:transparent;cursor:default}',
      '.edh-mcp-reload:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:1px}',
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

    // ---------------------------------------------------------------------
    // Remote access
    //
    // One page in Settings that publishes this GUI to a phone on the same
    // network: the switch, the port, one account, and the addresses to type
    // into the phone. The Host half owns the listener, the login page, and the
    // sessions; this page owns the decisions a person makes about them, and it
    // says out loud that the connection is plain HTTP.
    // ---------------------------------------------------------------------

    /**
     * The Host route that reads the state (`GET`) and changes it (`POST`), in
     * the document-relative form the browser resolves against its own base.
     */
    const REMOTE_ROUTE = 'api/edh.remote'

    /** The row that owns the route; the page is useless without it. */
    const REMOTE_MODULE = '@moreweb/edh/remote'

    /** The Settings seat: one page in the Settings navigation. */
    const REMOTE_SECTION_SLOT = 'settings.section'

    /**
     * Where that page sits. MCP takes 16, so this is the next seat: the shipped
     * sections stay contiguous and the two EDH pages sit side by side instead of
     * one being an appendix at an arbitrary number.
     */
    const REMOTE_SECTION_ORDER = 17

    /** Every action the route accepts besides reading. */
    const REMOTE_ACTIONS = ['set', 'logout-all', 'regenerate-secret']

    /** The port the page offers before anything has been chosen. */
    const REMOTE_DEFAULT_PORT = 8787

    /**
     * The range the page accepts, and the same one the Host enforces: a port is
     * a whole number from 1 to 65535. The page states the rule before the
     * request goes out; it does not invent a stricter one, because a page that
     * refuses a value the Host would store is a page arguing with its own Host.
     */
    const REMOTE_PORT_MIN = 1
    const REMOTE_PORT_MAX = 65535

    /** The longest user name the Host stores; the page checks it the same way. */
    const REMOTE_USERNAME_MAX = 64

    /**
     * The shortest password the Host accepts, mirrored here so the common typo
     * is caught before a request goes out. The confirm field is the page's own
     * addition: the Host has no idea it exists, and it never travels.
     */
    const REMOTE_PASSWORD_MIN = 8

    /** How long `Saved` stays before it clears itself. */
    const REMOTE_SAVED_MS = 3000

    /** How long one address says `Copied` before it goes back. */
    const REMOTE_COPY_MS = 2000

    /** The reasons that mean the feature is not on this profile at all. */
    const REMOTE_MISSING = ['unavailable', 'no-services', 'missing']

    /**
     * One route answer's view, read without trusting the Host's shape.
     *
     * Only the fields the page renders are copied. A password, a secret, or a
     * token in the answer is never read at all — the page learns whether one is
     * set (`hasPassword`), never what it is — so no response can echo a secret
     * into a record, and from there into the DOM.
     * @param payload - one route answer.
     * @returns the view record, or `undefined` when the answer carries none.
     */
    function remoteView(payload) {
      if (payload === null || typeof payload !== 'object') return undefined
      const known = ['available', 'enabled', 'listening', 'port', 'username', 'hasPassword', 'addresses', 'warning', 'sessions']
      let present = false
      for (const field of known) {
        if (Object.prototype.hasOwnProperty.call(payload, field)) present = true
      }
      if (!present) return undefined
      const port = Number(payload.port)
      const sessions = Number(payload.sessions)
      const addresses = []
      for (const raw of Array.isArray(payload.addresses) ? payload.addresses : []) {
        if (typeof raw !== 'string') continue
        const address = raw.trim()
        if (address !== '' && !addresses.includes(address)) addresses.push(address)
      }
      return {
        available: payload.available !== false,
        enabled: payload.enabled === true,
        listening: payload.listening === true,
        port: Number.isInteger(port) && port > 0 && port <= REMOTE_PORT_MAX ? port : REMOTE_DEFAULT_PORT,
        username: typeof payload.username === 'string' ? payload.username.trim() : '',
        hasPassword: payload.hasPassword === true,
        addresses,
        warning: typeof payload.warning === 'string' ? payload.warning.trim() : '',
        sessions: Number.isInteger(sessions) && sessions > 0 ? sessions : 0,
        // A listener that failed says so in its own words. Only the error-ish
        // fields are read: a successful answer may carry an unrelated `message`.
        failure: failureText({
          lastError: payload.lastError,
          error: payload.error,
          detail: payload.detail,
        }),
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
    function remoteReport(value) {
      if (value === null || typeof value !== 'object') return undefined
      return {
        ok: value.ok === true,
        action: typeof value.action === 'string' ? value.action : '',
        reason: typeof value.reason === 'string' ? value.reason : '',
        message: typeof value.message === 'string' ? value.message.trim() : '',
      }
    }

    /**
     * The view one route answer describes.
     *
     * A `GET` answers the state; a `POST` answers the same state plus a report,
     * and the view in *that* answer is the one to adopt — the page never re-reads
     * to find out what its own write did. Two consequences worth naming: a save
     * cannot be lost to a race with a second read, and a 400 that carries the
     * view still updates the page to the Host's truth.
     * @param payload - the route's parsed answer.
     * @returns whether the answer carries a view, the view, the action report,
     *   the sentence explaining anything that failed, and the refusal reason.
     */
    function readRemoteView(payload) {
      const answer = payload !== null && typeof payload === 'object' ? payload : {}
      const view = remoteView(answer)
      const report = remoteReport(answer.report)
      let failure = ''
      if (report !== undefined && report.ok !== true && report.message !== '') failure = report.message
      if (failure === '' && answer.ok === false) failure = failureText(answer)
      return {
        ok: view !== undefined,
        view,
        report,
        failure,
        reason: typeof answer.reason === 'string' ? answer.reason : '',
      }
    }

    /**
     * Whether one read says the feature is absent from this profile.
     * @param read - a `readRemoteView` result.
     */
    function remoteMissing(read) {
      if (read === null || typeof read !== 'object') return false
      if (read.view !== undefined && read.view !== null && read.view.available === false) return true
      return REMOTE_MISSING.includes(String(read.reason ?? ''))
    }

    /**
     * The listener state one view is in.
     *
     * The page names four states and no more. A switch that is off reads Off
     * whatever the listener last said, because nothing is meant to be running
     * behind it; a switch that is on but not listening is Starting until the
     * Host puts a sentence on it, and Failed after that.
     * @param view - a `remoteView` result, or the merged record the page keeps.
     * @returns `off`, `starting`, `listening`, or `failed`.
     */
    function remoteState(view) {
      const data = view !== null && typeof view === 'object' ? view : {}
      if (data.enabled !== true) return 'off'
      if (data.listening === true) return 'listening'
      if (typeof data.failure === 'string' && data.failure !== '') return 'failed'
      return 'starting'
    }

    /**
     * The dictionary key of one state's one word.
     * @param state - a `remoteState` result.
     */
    function remoteStateLabel(state) {
      switch (state) {
        case 'listening': return 'remoteStateListening'
        case 'starting': return 'remoteStateStarting'
        case 'failed': return 'remoteStateFailed'
        default: return 'remoteStateOff'
      }
    }

    /**
     * The colour one state paints its dot: `ok`, `busy`, `bad`, or `off`.
     * @param state - a `remoteState` result.
     */
    function remoteStateTone(state) {
      switch (state) {
        case 'listening': return 'ok'
        case 'starting': return 'busy'
        case 'failed': return 'bad'
        default: return 'off'
      }
    }

    /**
     * One port field's value, checked before anything is sent.
     * @param text - the input's value.
     * @returns the port, or the field and sentence that block it.
     */
    function portCheck(text) {
      const raw = String(text ?? '').trim()
      if (raw === '' || !/^\d+$/u.test(raw)) return { ok: false, field: 'port', message: 'remotePortInvalid' }
      const port = Number(raw)
      if (!Number.isInteger(port) || port < REMOTE_PORT_MIN || port > REMOTE_PORT_MAX) {
        return { ok: false, field: 'port', message: 'remotePortRange' }
      }
      return { ok: true, port }
    }

    /**
     * The form's values, seeded from a view.
     *
     * The two password fields are always empty, whatever the view says: the Host
     * never sends a password back, and a page that prefilled one would be
     * displaying a secret it does not have. That is why this is the only place
     * the form is built from a response.
     * @param view - a `remoteView` result, or nothing at all.
     */
    function remoteDraft(view) {
      const data = view !== null && typeof view === 'object' ? view : {}
      const port = Number(data.port)
      return {
        port: String(Number.isInteger(port) && port > 0 ? port : REMOTE_DEFAULT_PORT),
        username: typeof data.username === 'string' ? data.username : '',
        password: '',
        confirm: '',
      }
    }

    /**
     * The save form turned into the body the Host should apply.
     *
     * The password only travels when one was typed, and the confirm field never
     * travels at all: it exists so a typo cannot lock the owner out of their own
     * GUI, and the Host has no idea it exists.
     * @param draft - the form's current values.
     * @returns the body and the fields it carries, or the field and sentence
     *   that block it.
     */
    function validateRemoteDraft(draft) {
      const form = draft !== null && typeof draft === 'object' ? draft : {}
      const checked = portCheck(form.port)
      if (!checked.ok) return checked
      const username = typeof form.username === 'string' ? form.username.trim() : ''
      if (username === '') return { ok: false, field: 'username', message: 'remoteUsernameRequired' }
      if (username.length > REMOTE_USERNAME_MAX) {
        return { ok: false, field: 'username', message: 'remoteUsernameInvalid' }
      }
      const password = typeof form.password === 'string' ? form.password : ''
      const confirm = typeof form.confirm === 'string' ? form.confirm : ''
      if (password !== '' || confirm !== '') {
        if (password.length < REMOTE_PASSWORD_MIN) {
          return { ok: false, field: 'password', message: 'remotePasswordShort' }
        }
        if (password !== confirm) return { ok: false, field: 'confirm', message: 'remotePasswordMismatch' }
      }
      const body = { action: 'set', port: checked.port, username }
      const fields = ['port', 'username']
      if (password !== '') {
        body.password = password
        fields.push('password')
      }
      return { ok: true, body, fields }
    }

    /**
     * The body that starts or stops the listener.
     *
     * Stopping is one field and never touches the account. Starting with no
     * stored password has to carry one, or the GUI would be published with its
     * login page open to anyone on the network — so that one case validates the
     * form, and saves it in the same request.
     * @param view - the view on screen.
     * @param draft - the form's current values.
     */
    function toggleBody(view, draft) {
      const data = view !== null && typeof view === 'object' ? view : undefined
      const state = remoteState(data)
      if (state !== 'off' && state !== 'failed') {
        return { ok: true, body: { action: 'set', enabled: false }, fields: ['enabled'] }
      }
      const form = draft !== null && typeof draft === 'object' ? draft : {}
      const typed = String(form.password ?? '') !== '' || String(form.confirm ?? '') !== ''
      if (data !== undefined && data.hasPassword === true && !typed) {
        return { ok: true, body: { action: 'set', enabled: true }, fields: ['enabled'] }
      }
      const checked = validateRemoteDraft(form)
      if (!checked.ok) return checked
      // A start with no stored password and no typed one would publish the GUI
      // with its login page open to the network, so it waits for a password.
      if (String(form.password ?? '') === '') {
        return { ok: false, field: 'password', message: 'remotePasswordRequired' }
      }
      return { ok: true, body: { ...checked.body, enabled: true }, fields: [...checked.fields, 'enabled'] }
    }

    /**
     * One body that names an action and nothing else.
     * @param action - `logout-all` or `regenerate-secret`.
     */
    function remoteActionBody(action) {
      return { action }
    }

    /**
     * One refusal turned into the field it came from and the sentence to show.
     *
     * The Host words a rejection in `report.message`; this is only the fallback
     * for the codes it can name without a sentence, and the pointer at which
     * field to correct.
     * @param report - a `remoteReport` result.
     */
    function remoteRefusal(report) {
      const reason = report !== null && typeof report === 'object' && typeof report.reason === 'string'
        ? report.reason
        : ''
      switch (reason) {
        case 'bad-port': return { field: 'port', message: 'remotePortInvalid' }
        case 'port-range':
        case 'bad-port-range': return { field: 'port', message: 'remotePortRange' }
        case 'port-in-use':
        case 'eaddrinuse': return { field: 'port', message: 'remotePortInUse' }
        case 'bad-username': return { field: 'username', message: 'remoteUsernameInvalid' }
        case 'bad-password':
        case 'password-required': return { field: 'password', message: 'remotePasswordRequired' }
        default: return { field: '', message: 'remoteActionFailed' }
      }
    }

    /**
     * One address as the string to type into the phone.
     *
     * The Host may hand back a bare host, a base URL, or something with a port
     * already on it; all three become one absolute `http://` line, and only the
     * port the page is actually listening on is filled in when none was given.
     * @param address - one entry from the view's `addresses`.
     * @param port - the port the listener reported.
     */
    function addressLine(address, port) {
      const text = String(address ?? '').trim()
      if (text === '') return ''
      const known = Number.isInteger(port) && port > 0 ? port : REMOTE_DEFAULT_PORT
      const withScheme = /^https?:\/\//iu.test(text) ? text : `http://${text}`
      const rest = withScheme.replace(/^https?:\/\//iu, '').replace(/\/+$/u, '')
      const cut = rest.search(/[/?#]/u)
      const authority = cut < 0 ? rest : rest.slice(0, cut)
      if (authority === '') return ''
      const bracketed = /^\[[^\]]+\]:\d+$/u.test(authority)
      const plain = /^[^:]+:\d+$/u.test(authority)
      const scheme = withScheme.slice(0, withScheme.indexOf('//') + 2)
      return `${scheme}${bracketed || plain ? authority : `${authority}:${known}`}`
    }

    /**
     * The page's address list: one line per address, in the Host's order.
     * @param view - a `remoteView` result.
     */
    function remoteAddressLines(view) {
      const data = view !== null && typeof view === 'object' ? view : {}
      const lines = []
      for (const address of Array.isArray(data.addresses) ? data.addresses : []) {
        const line = addressLine(address, data.port)
        if (line !== '' && !lines.includes(line)) lines.push(line)
      }
      return lines
    }

    /**
     * The plain-HTTP warning, in the order it is shown.
     *
     * The page's own sentence is always there — this feature decided plain HTTP
     * on purpose, so the tradeoff is stated on the page rather than only when
     * something goes wrong. The Host's `warning`, when it gives one, follows it
     * in its own words instead of replacing it.
     * @param view - a `remoteView` result.
     * @param t - the dictionary's translate function.
     * @returns one sentence per line.
     */
    function warningLines(view, t) {
      const lines = [t('remotePlainHttp')]
      const data = view !== null && typeof view === 'object' ? view : {}
      const host = typeof data.warning === 'string' ? data.warning.trim() : ''
      if (host !== '' && !lines.includes(host)) lines.push(host)
      return lines
    }

    /**
     * How many phones are signed in, as one sentence.
     * @param t - the dictionary's translate function.
     * @param count - the view's `sessions`.
     */
    function sessionsText(t, count) {
      const value = Number(count)
      if (!Number.isInteger(value) || value <= 0) return t('remoteNoSessions')
      return value === 1 ? t('remoteSessionOne') : t('remoteSessions', { count: value })
    }

    /**
     * One request on the remote route.
     *
     * A rejected input answers a non-200 status with the same JSON body a 200
     * would carry, so the body decides. Only a reply without one is a route
     * failure — and it carries the status, because a missing route means the
     * feature is not on this profile rather than that the read went wrong.
     * @param method - `GET` to read, `POST` to change.
     * @param body - the request body, if the method takes one.
     * @returns the parsed answer.
     */
    async function requestRemote(method, body) {
      const response = await fetch(REMOTE_ROUTE, {
        method,
        headers: body === undefined
          ? { accept: 'application/json' }
          : { accept: 'application/json', 'content-type': 'application/json' },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      })
      if (response === null || response === undefined) throw new Error(`${REMOTE_ROUTE} answered nothing`)
      let answer
      try {
        answer = await response.json()
      } catch (error) {
        answer = undefined
      }
      if (answer !== null && typeof answer === 'object') return answer
      const failure = new Error(`${REMOTE_ROUTE} answered ${response.status}`)
      failure.status = response.status
      throw failure
    }

    /**
     * The page, rendered from one explicit state.
     *
     * Kept apart from the component for the same reason the reload copy is kept
     * in `reloadText`: a session with no browser has no other way to see what a
     * state actually paints, and "the unavailable page has no dead controls" is
     * a claim about markup, not about a flag.
     * @param t - the dictionary's translate function.
     * @param state - the component's state, its ids, and the handlers it wired.
     */
    function remotePage(t, state) {
      const source = state !== null && typeof state === 'object' ? state : {}
      const view = source.view !== null && typeof source.view === 'object' ? source.view : {}
      const status = typeof view.status === 'string' ? view.status : 'loading'
      const data = view.data !== null && typeof view.data === 'object' ? view.data : undefined
      const draft = source.draft !== null && typeof source.draft === 'object' ? source.draft : remoteDraft(undefined)
      const fieldError = source.fieldError !== null && typeof source.fieldError === 'object'
        ? source.fieldError
        : { field: '', text: '' }
      const notice = source.notice !== null && typeof source.notice === 'object'
        ? source.notice
        : { text: '', tone: 'bad' }
      const copy = source.copy !== null && typeof source.copy === 'object'
        ? source.copy
        : { address: '', copied: false }
      /**
       * The address the reader asked to see as a code, not a flag: a code drawn
       * for one address must not survive the list changing under it, so the block
       * only renders while this still names the first line.
       */
      const code = typeof source.code === 'string' ? source.code : ''
      const ids = source.ids !== null && typeof source.ids === 'object' ? source.ids : {}
      const actions = source.actions !== null && typeof source.actions === 'object' ? source.actions : {}
      const busy = typeof source.busy === 'string' ? source.busy : ''
      const saving = busy === 'save'
      const call = (name, ...parameters) => {
        const handler = actions[name]
        if (typeof handler === 'function') handler(...parameters)
      }

      /** The page frame: the heading and its one line, in every state. */
      const frame = (...children) => h('div', { className: 'edh-remote' },
        h('h2', { className: 'edh-remote-title' }, t('remoteTitle')),
        h('p', { className: 'edh-remote-intro' }, t('remoteIntro')),
        ...children,
      )

      if (source.enabled === false) {
        return frame(h('p', { className: 'edh-remote-status' }, t('remoteOff')))
      }

      const noticeNode = notice.text === ''
        ? []
        : [h('p', {
          className: 'edh-remote-notice',
          'data-tone': notice.tone === 'ok' ? 'ok' : 'bad',
          role: notice.tone === 'ok' ? 'status' : 'alert',
        }, notice.text)]

      if (status === 'loading') {
        return frame(...noticeNode, h('p', { className: 'edh-remote-status', role: 'status' }, t('remoteLoading')))
      }

      if (status === 'error') {
        return frame(...noticeNode, h('div', { className: 'edh-remote-error', role: 'alert' },
          h('p', { className: 'edh-remote-status' }, t('remoteLoadFailed')),
          typeof view.failure === 'string' && view.failure !== ''
            ? h('p', { className: 'edh-remote-failure' }, view.failure)
            : null,
          h('button', {
            type: 'button',
            className: 'edh-remote-button edh-remote-buttonPrimary',
            onClick: () => {
              call('retry')
            },
          }, t('remoteRetry')),
        ))
      }

      if (status !== 'ready' || data === undefined) {
        // `unavailable` lands here. One sentence, and nothing to press: a control
        // in front of a missing service is a promise this profile cannot keep.
        return frame(...noticeNode, h('p', { className: 'edh-remote-status' }, t('remoteUnavailable')))
      }

      const stateWord = remoteState(data)
      const startable = stateWord === 'off' || stateWord === 'failed'
      const lines = remoteAddressLines(data)
      // The code is offered for the first address; `shown` is true only while the
      // reader's choice still names that address, which is how a code collapses
      // by itself when the listener moves or the list is rebuilt.
      const firstLine = lines[0] ?? ''
      const qrOffer = firstLine === '' ? undefined : remoteQrModel(firstLine)
      const shown = code !== '' && code === firstLine && qrOffer !== undefined
      const blocked = field => (fieldError.field === field
        ? { 'aria-invalid': true, 'aria-describedby': ids.error }
        : {})
      const failureNode = () => (typeof fieldError.text === 'string' && fieldError.text !== ''
        ? h('p', { className: 'edh-remote-failure', role: 'alert', id: ids.error }, fieldError.text)
        : null)
      const fieldRow = (key, id, label, control, hint) => h('div', { key, className: 'edh-remote-row' },
        h('label', { className: 'edh-remote-fieldLabel', htmlFor: id }, label),
        h('div', { className: 'edh-remote-control' },
          control,
          typeof hint === 'string' && hint !== ''
            ? h('p', { className: 'edh-remote-hint', id: key === 'password' ? ids.passwordHint : undefined }, hint)
            : null,
          fieldError.field === key ? failureNode() : null,
        ),
      )

      return frame(...noticeNode, h('form', {
        className: 'edh-remote-form',
        'aria-label': t('remoteAccount'),
        onSubmit: event => {
          if (event !== null && typeof event === 'object' && typeof event.preventDefault === 'function') {
            event.preventDefault()
          }
          call('submit')
        },
      },
        h('div', { key: 'state', className: 'edh-remote-row', 'data-kind': 'state' },
          h('div', { className: 'edh-remote-stateCol' },
            h('span', { className: 'edh-remote-state' },
              h('span', {
                className: 'edh-remote-dot',
                'data-tone': remoteStateTone(stateWord),
                'aria-hidden': true,
              }),
              h('span', { className: 'edh-remote-stateWord' }, t(remoteStateLabel(stateWord))),
            ),
            h('span', { className: 'edh-remote-hint' }, sessionsText(t, data.sessions)),
            data.failure === ''
              ? null
              : h('span', { className: 'edh-remote-failure', role: 'alert' }, data.failure),
          ),
          h('div', { className: 'edh-remote-control edh-remote-controlEnd' },
            h('button', {
              type: 'button',
              className: 'edh-remote-button',
              disabled: busy !== '',
              'aria-busy': busy === 'toggle' || undefined,
              onClick: () => {
                call('toggle')
              },
            }, startable ? t('remoteStart') : t('remoteStop')),
          ),
        ),
        fieldRow('port', ids.port, t('remotePort'), h('input', {
          id: ids.port,
          type: 'number',
          className: 'edh-remote-input edh-remote-port',
          inputMode: 'numeric',
          min: REMOTE_PORT_MIN,
          max: REMOTE_PORT_MAX,
          step: 1,
          value: draft.port,
          autoComplete: 'off',
          spellCheck: false,
          ...blocked('port'),
          onChange: event => {
            call('field', 'port', event.target.value)
          },
        }), t('remotePortHint')),
        fieldRow('username', ids.username, t('remoteUsername'), h('input', {
          id: ids.username,
          type: 'text',
          className: 'edh-remote-input',
          value: draft.username,
          autoComplete: 'username',
          spellCheck: false,
          ...blocked('username'),
          onChange: event => {
            call('field', 'username', event.target.value)
          },
        })),
        fieldRow('password', ids.password, t('remotePassword'), h('input', {
          id: ids.password,
          type: 'password',
          className: 'edh-remote-input',
          value: draft.password,
          autoComplete: 'new-password',
          spellCheck: false,
          'aria-invalid': fieldError.field === 'password' || undefined,
          'aria-describedby': fieldError.field === 'password' ? `${ids.passwordHint} ${ids.error}` : ids.passwordHint,
          onChange: event => {
            call('field', 'password', event.target.value)
          },
        }), t('remotePasswordHint')),
        fieldRow('confirm', ids.confirm, t('remotePasswordConfirm'), h('input', {
          id: ids.confirm,
          type: 'password',
          className: 'edh-remote-input',
          value: draft.confirm,
          autoComplete: 'new-password',
          spellCheck: false,
          ...blocked('confirm'),
          onChange: event => {
            call('field', 'confirm', event.target.value)
          },
        })),
        h('div', { key: 'save', className: 'edh-remote-row', 'data-kind': 'save' },
          h('span', { className: 'edh-remote-fieldLabel' }),
          h('div', { className: 'edh-remote-control edh-remote-controlEnd' },
            h('span', { className: 'edh-remote-hint', role: 'status' },
              saving ? t('remoteSaving') : source.saved === true ? t('remoteSaved') : ''),
            h('button', {
              type: 'submit',
              className: 'edh-remote-button edh-remote-buttonPrimary',
              disabled: busy !== '',
              'aria-busy': saving || undefined,
            }, t('remoteSave')),
          ),
        ),
        h('div', { key: 'addresses', className: 'edh-remote-row' },
          h('span', { className: 'edh-remote-fieldLabel' }, t('remoteAddresses')),
          h('div', { className: 'edh-remote-control' },
            lines.length === 0
              ? h('p', { className: 'edh-remote-hint' }, t('remoteAddressesWaiting'))
              : [
                h('p', { key: 'hint', className: 'edh-remote-hint' }, t('remoteAddressesHint')),
                // The failure people actually hit is a phone on another network.
                h('p', { key: 'phone', className: 'edh-remote-hint' }, t('remotePhoneHint')),
                h('ul', { key: 'list', className: 'edh-remote-addresses' },
                  lines.map(line => h('li', { key: line, className: 'edh-remote-address' },
                    h('code', { className: 'edh-remote-url' }, line),
                    h('button', {
                      type: 'button',
                      className: 'edh-remote-button edh-remote-buttonSm',
                      onClick: () => {
                        call('copy', line)
                      },
                    }, copy.address === line && copy.copied === true ? t('copied') : t('copy')),
                  ))),
                // The code is offered for the first address and for the address
                // the reader asked about: when the list changes, `shown` no longer
                // matches and the block collapses on its own.
                qrOffer === undefined
                  ? null
                  : h('div', { key: 'qr', className: 'edh-remote-qrBlock' },
                    h('button', {
                      type: 'button',
                      className: 'edh-remote-button edh-remote-buttonSm',
                      'aria-expanded': shown,
                      onClick: () => {
                        call('code')
                      },
                    }, shown ? t('remoteQrHide') : t('remoteQrShow')),
                    shown
                      ? [
                        remoteQrSvg(qrOffer, t('remoteQrLabel', { address: lines[0] })),
                        h('p', { key: 'qr-address', className: 'edh-remote-qrAddress' }, lines[0]),
                        h('button', {
                          key: 'qr-copy',
                          type: 'button',
                          className: 'edh-remote-button edh-remote-buttonSm',
                          onClick: () => {
                            call('copy', lines[0])
                          },
                        }, copy.address === lines[0] && copy.copied === true ? t('copied') : t('copy')),
                      ]
                      : null,
                  ),
              ],
          ),
        ),
        ...warningLines(data, t).map((line, index) => h('p', {
          key: `warning-${index}`,
          className: 'edh-remote-warning',
        }, line)),
        h('div', { key: 'signout', className: 'edh-remote-row' },
          h('p', { className: 'edh-remote-fieldLabel edh-remote-hint' }, t('remoteSignOutHint')),
          h('div', { className: 'edh-remote-control edh-remote-controlEnd' },
            h('button', {
              type: 'button',
              className: 'edh-remote-button',
              'data-danger': true,
              disabled: busy !== '' || data.sessions === 0,
              onClick: () => {
                call('signOut')
              },
            }, t('remoteSignOut')),
          ),
        ),
      ))
    }

    /**
     * The remote-access page: the listener, one account, and the addresses.
     *
     * It reads the `remote` row's own enablement rather than the aggregate,
     * because the row is what mounts the route behind it. The nav entry is gated
     * the same way where it is registered; this is the answer for the one case
     * registration cannot cover, a row switched off while the page is open.
     * @param t - the dictionary's translate function.
     * @param controller - the switch controller holding the row states.
     */
    function createRemotePage(t, controller) {
      const useRemoteEnabled = createFeatureHook(controller, REMOTE_MODULE, rowEnabled)

      return function EdhRemotePage() {
        const enabled = useRemoteEnabled()
        const [view, setView] = React.useState(() => ({ status: 'loading', data: undefined, failure: '' }))
        const [attempt, setAttempt] = React.useState(0)
        const [draft, setDraft] = React.useState(() => remoteDraft(undefined))
        const [fieldError, setFieldError] = React.useState({ field: '', text: '' })
        const [busy, setBusy] = React.useState('')
        const [saved, setSaved] = React.useState(false)
        const [notice, setNotice] = React.useState({ text: '', tone: 'bad' })
        const [copy, setCopy] = React.useState({ address: '', copied: false, at: 0 })
        /** The address the QR was asked for; empty means no code is showing. */
        const [code, setCode] = React.useState('')
        const seeded = React.useRef(false)
        const base = React.useId()
        const ids = {
          port: `${base}port`,
          username: `${base}username`,
          password: `${base}password`,
          confirm: `${base}confirm`,
          passwordHint: `${base}passwordHint`,
          error: `${base}error`,
        }

        // Read once on mount and once per retry. The page never polls: every
        // change answers the new state itself.
        React.useEffect(() => {
          if (!enabled) return undefined
          let current = true
          setView(previous => ({ status: 'loading', data: previous.data, failure: '' }))
          void (async () => {
            let answer
            try {
              answer = await requestRemote('GET')
            } catch (error) {
              if (!current) return
              // A route that is not there is not a read that went wrong: it
              // means the services are missing on this profile.
              const missing = error?.status === 404 || error?.status === 405
              remoteWrite({
                phase: 'failed',
                action: 'read',
                reason: missing ? 'route-missing' : 'error',
                message: messageOf(error),
              })
              setView({
                status: missing ? 'unavailable' : 'error',
                data: undefined,
                failure: missing ? '' : messageOf(error),
              })
              return
            }
            if (!current) return
            const read = readRemoteView(answer)
            if (!read.ok || (read.view !== undefined && read.view.available === false)) {
              const missing = remoteMissing(read)
              remoteWrite({
                phase: 'failed',
                action: 'read',
                reason: missing ? 'unavailable' : String(read.reason || 'error'),
                message: read.failure,
              })
              setView({ status: missing ? 'unavailable' : 'error', data: undefined, failure: read.failure })
              return
            }
            remoteWrite({
              phase: 'loaded',
              enabled: read.view.enabled,
              listening: read.view.listening,
              port: read.view.port,
              addresses: read.view.addresses.length,
              sessions: read.view.sessions,
            })
            setView({
              status: 'ready',
              data: read.failure === '' ? read.view : { ...read.view, failure: read.failure },
              failure: read.failure,
            })
          })()
          return () => {
            current = false
          }
        }, [enabled, attempt])

        // The fields are seeded from the Host's own state once. A later answer
        // must not overwrite what someone is in the middle of typing; the write
        // paths re-seed explicitly, and always with empty password fields.
        React.useEffect(() => {
          if (view.status !== 'ready' || view.data === undefined || seeded.current) return
          seeded.current = true
          setDraft(remoteDraft(view.data))
        }, [view])

        // `Saved` and `Copied` are confirmations, not states: they clear.
        React.useEffect(() => {
          if (!saved) return undefined
          const timer = setTimeout(() => setSaved(false), REMOTE_SAVED_MS)
          return () => clearTimeout(timer)
        }, [saved])

        React.useEffect(() => {
          if (copy.at === 0) return undefined
          const timer = setTimeout(() => setCopy({ address: '', copied: false, at: 0 }), REMOTE_COPY_MS)
          return () => clearTimeout(timer)
        }, [copy.at])

        /**
         * One write on the route.
         *
         * The answer's view replaces the one on screen; a refusal is read from
         * its report rather than the status code, and lands on the field it came
         * from when the Host names one.
         * @returns the adopted read and whether the Host accepted it, or
         *   `undefined` when no answer arrived at all.
         */
        const send = React.useCallback(async (body, key, action) => {
          setBusy(key)
          setNotice({ text: '', tone: 'bad' })
          let answer
          try {
            answer = await requestRemote('POST', body)
          } catch (error) {
            remoteWrite({ phase: 'failed', action, reason: 'error', message: messageOf(error) })
            setBusy('')
            setNotice({ text: messageOf(error), tone: 'bad' })
            return undefined
          }
          setBusy('')
          const read = readRemoteView(answer)
          if (read.ok) {
            setView({
              status: 'ready',
              data: read.failure === '' ? read.view : { ...read.view, failure: read.failure },
              failure: read.failure,
            })
          }
          const rejected = read.report !== undefined && read.report.ok !== true
          if (rejected) {
            const refusal = remoteRefusal(read.report)
            const text = read.failure !== '' ? read.failure : t(refusal.message)
            if (read.ok && refusal.field !== '') setFieldError({ field: refusal.field, text })
            else setNotice({ text, tone: 'bad' })
            remoteWrite({ phase: 'failed', action, reason: String(read.report.reason || 'error'), message: text })
            return { read, ok: false }
          }
          if (!read.ok) {
            const text = read.failure !== '' ? read.failure : t('remoteActionFailed')
            setNotice({ text, tone: 'bad' })
            remoteWrite({ phase: 'failed', action, reason: String(read.reason || 'error'), message: text })
            return { read, ok: false }
          }
          return { read, ok: true }
        }, [t])

        const onRetry = React.useCallback(() => {
          setAttempt(value => value + 1)
        }, [])

        const onField = React.useCallback((name, value) => {
          setDraft(previous => ({ ...previous, [name]: value }))
          setFieldError({ field: '', text: '' })
          setSaved(false)
        }, [])

        const onSave = React.useCallback(async () => {
          const checked = validateRemoteDraft(draft)
          if (!checked.ok) {
            setFieldError({ field: checked.field, text: t(checked.message) })
            return
          }
          setFieldError({ field: '', text: '' })
          setSaved(false)
          const done = await send(checked.body, 'save', 'set')
          if (done === undefined || !done.ok) return
          setDraft(remoteDraft(done.read.view))
          remoteWrite({ phase: 'saved', field: checked.fields.join('+'), listening: done.read.view.listening })
          setSaved(true)
        }, [draft, send, t])

        const onToggle = React.useCallback(async () => {
          const planned = toggleBody(view.data, draft)
          if (!planned.ok) {
            setFieldError({ field: planned.field, text: t(planned.message) })
            return
          }
          setFieldError({ field: '', text: '' })
          setSaved(false)
          const start = planned.body.enabled === true
          const done = await send(planned.body, 'toggle', start ? 'start' : 'stop')
          if (done === undefined || !done.ok) return
          setDraft(remoteDraft(done.read.view))
          remoteWrite({ phase: 'saved', field: planned.fields.join('+') })
          remoteWrite(start
            ? { phase: 'started', port: done.read.view.port, addresses: done.read.view.addresses.length }
            : { phase: 'stopped', port: done.read.view.port })
        }, [view, draft, send, t])

        const onSignOut = React.useCallback(async () => {
          const done = await send(remoteActionBody('logout-all'), 'signout', 'logout-all')
          if (done === undefined || !done.ok) return
          setDraft(remoteDraft(done.read.view))
          setNotice({ text: t('remoteSignedOut'), tone: 'ok' })
          remoteWrite({ phase: 'saved', field: 'sessions', sessions: done.read.view.sessions })
        }, [send, t])

        const onCopy = React.useCallback(async address => {
          const copied = await copyText(address)
          setCopy({ address, copied, at: Date.now() })
        }, [])

        // One code, for the address on screen. Nothing else about the page
        // changes, so the code is state and not a setting.
        const onCode = React.useCallback(() => {
          const address = remoteAddressLines(view.data)[0] ?? ''
          setCode(previous => (previous === address ? '' : address))
        }, [view])

        return remotePage(t, {
          enabled,
          view,
          draft,
          fieldError,
          busy,
          saved,
          notice,
          copy,
          code,
          ids,
          actions: {
            retry: onRetry,
            field: onField,
            submit: onSave,
            toggle: onToggle,
            signOut: onSignOut,
            copy: onCopy,
            code: onCode,
          },
        })
      }
    }

    /**
     * The page's stylesheet.
     *
     * Rows and hairlines, not cards: this page is a list of decisions, and the
     * only fill on it is the one the shipped sections already use for a button.
     * Every rule is built from `--dsw-alias-*` tokens, including the focus ring.
     */
    const REMOTE_CSS = [
      '.edh-remote{color:var(--dsw-alias-label-primary);flex-direction:column;gap:12px;max-width:760px;display:flex}',
      '.edh-remote-title{margin:0;font-size:16px;font-weight:500;line-height:24px}',
      '.edh-remote-intro{color:var(--dsw-alias-label-tertiary);margin:0;font-size:14px;line-height:22px}',
      '.edh-remote-status{color:var(--dsw-alias-label-tertiary);margin:0;font-size:13px;line-height:20px}',
      '.edh-remote-error{flex-direction:column;align-items:flex-start;gap:10px;display:flex}',
      '.edh-remote-notice{color:var(--dsw-alias-label-secondary);margin:0;font-size:12px;line-height:18px}',
      '.edh-remote-notice[data-tone=bad]{color:var(--dsw-alias-state-error-primary)}',
      '.edh-remote-notice[data-tone=ok]{color:var(--dsw-alias-state-success-primary)}',
      '.edh-remote-form{flex-direction:column;margin:0;display:flex}',
      '.edh-remote-row{border-bottom:.5px solid var(--dsw-alias-border-l2);grid-template-columns:180px minmax(0,1fr);align-items:start;gap:4px 16px;padding:10px 0;display:grid}',
      '.edh-remote-row[data-kind=state]{grid-template-columns:minmax(0,1fr) max-content;align-items:center}',
      '.edh-remote-row:last-of-type{border-bottom:none;padding-bottom:0}',
      '.edh-remote-fieldLabel{color:var(--dsw-alias-label-secondary);margin:0;padding-top:5px;font-size:12px;line-height:18px}',
      '.edh-remote-control{flex-direction:column;align-items:flex-start;gap:4px;min-width:0;display:flex}',
      '.edh-remote-controlEnd{flex-direction:row;align-items:center;justify-content:flex-end;gap:8px}',
      '.edh-remote-stateCol{flex-direction:column;gap:2px;min-width:0;display:flex}',
      '.edh-remote-state{align-items:center;gap:6px;color:var(--dsw-alias-label-secondary);display:flex;font-size:13px;line-height:20px}',
      '.edh-remote-stateWord{color:var(--dsw-alias-label-primary);font-size:13px;line-height:20px}',
      '.edh-remote-dot{border-radius:50%;flex:none;background:currentColor;width:6px;height:6px;display:inline-block}',
      '.edh-remote-dot[data-tone=ok]{color:var(--dsw-alias-state-success-primary)}',
      '.edh-remote-dot[data-tone=busy]{color:var(--dsw-alias-state-warn-primary)}',
      '.edh-remote-dot[data-tone=bad]{color:var(--dsw-alias-state-error-primary)}',
      '.edh-remote-dot[data-tone=off]{color:var(--dsw-alias-state-idle-primary)}',
      '.edh-remote-hint{color:var(--dsw-alias-label-tertiary);margin:0;font-size:12px;line-height:18px}',
      '.edh-remote-failure{color:var(--dsw-alias-state-error-primary);margin:0;font-size:12px;line-height:18px}',
      '.edh-remote-input{box-sizing:border-box;width:100%;max-width:320px;min-height:28px;margin:0;padding:3px 8px;border:.5px solid var(--dsw-alias-border-l4);border-radius:var(--dsw-radius-sm);outline:none;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font:inherit;font-size:13px;line-height:20px}',
      '.edh-remote-input::placeholder{color:var(--dsw-alias-label-dimmed)}',
      '.edh-remote-port{max-width:96px;font-variant-numeric:tabular-nums}',
      '.edh-remote-addresses{flex-direction:column;margin:0;padding:0;list-style:none;gap:4px;display:flex}',
      '.edh-remote-address{align-items:center;gap:8px;display:flex}',
      '.edh-remote-url{color:var(--dsw-alias-label-primary);font-family:var(--dsh-font-mono,ui-monospace,SFMono-Regular,Menlo,monospace);font-size:12px;line-height:18px;word-break:break-all}',
      '.edh-remote-warning{color:var(--dsw-alias-label-secondary);margin:0;font-size:12px;line-height:18px}',
      '.edh-remote-qrBlock{align-items:flex-start;flex-direction:column;gap:8px;margin-top:10px;display:flex}',
      '.edh-remote-qr{width:200px;height:200px;border-radius:var(--dsw-radius-sm);box-shadow:0 0 0 .5px var(--dsw-alias-border-l3);background:#fff}',
      '.edh-remote-qrAddress{color:var(--dsw-alias-label-secondary);margin:0;font-family:var(--dsh-font-mono,ui-monospace,Menlo,monospace);font-size:12px;line-height:18px;word-break:break-all}',
      '.edh-remote-button{box-sizing:border-box;color:var(--dsw-alias-label-secondary);cursor:pointer;background:0 0;border:none;border-radius:var(--dsw-radius-sm);justify-content:center;align-items:center;gap:4px;height:28px;padding:0 10px;font:inherit;font-size:12px;line-height:18px;white-space:nowrap;display:inline-flex}',
      '.edh-remote-buttonSm{height:24px;padding:0 8px}',
      '.edh-remote-button:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover)}',
      '.edh-remote-button:active:not(:disabled){background:var(--dsw-alias-interactive-bg-active)}',
      '.edh-remote-button:disabled{cursor:not-allowed;opacity:.4}',
      '.edh-remote-button[data-danger]:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover-danger);color:var(--dsw-alias-state-error-primary)}',
      '.edh-remote-buttonPrimary{background:var(--dsw-alias-button-primary-fill);color:var(--dsw-alias-label-primary-foreground)}',
      '.edh-remote-buttonPrimary:hover:not(:disabled){background:var(--dsw-alias-button-primary-hover)}',
      '.edh-remote :is(button,input,textarea,a):focus-visible{outline:var(--dsw-focus-ring-width) solid var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary));outline-offset:2px}',
    ].join('')

    /** Install the remote page stylesheet once and take it back out on dispose. */
    function installRemoteStyles() {
      if (typeof document === 'undefined') return () => {}
      const selector = 'style[data-edh-css="remote"]'
      if (document.querySelector(selector) === null) {
        const tag = document.createElement('style')
        tag.dataset.edhCss = 'remote'
        tag.dataset.plugin = '@moreweb/edh'
        tag.textContent = REMOTE_CSS
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
    // Usage
    //
    // Token usage across every session: the totals, one line per model per day,
    // and the share each model holds. The Host counts tokens; this page only
    // formats them, groups them, and draws them — every number on screen is a
    // number the Host sent, and every share is recomputed from the series that
    // are actually drawn, so the legend, the chart and the list cannot disagree.
    // ---------------------------------------------------------------------

    /** The Host route that reads the numbers (`GET`) and re-reads history (`POST`). */
    const USAGE_ROUTE = 'api/edh.usage'

    /** The row that owns the route; the page is useless without it. */
    const USAGE_MODULE = '@moreweb/edh/usage'

    /** The Settings seat: one page in the Settings navigation. */
    const USAGE_SECTION_SLOT = 'settings.section'

    /**
     * Where that page sits. MCP is 16 and Remote is 17, so this is the third
     * seat: the three EDH pages stay contiguous after the shipped sections.
     */
    const USAGE_SECTION_ORDER = 18

    /** Every action the route accepts besides reading. */
    const USAGE_ACTIONS = ['refresh', 'rebuild']

    /** The three ways the page can bucket the same days. */
    const USAGE_RANGES = ['daily', 'weekly', 'cumulative']

    /** The two session scopes the page offers. */
    const USAGE_SCOPES = ['all', 'main']

    /**
     * How many models are drawn on their own. The rest are folded into `Other`
     * so the palette means something: six colours, and every one of them is a
     * legend entry a person can point at.
     */
    const USAGE_SERIES_MAX = 5

    /**
     * The categorical palette, as literal values rather than theme tokens.
     *
     * Every hue sits at the same relative luminance (about 0.20), which is the
     * band that clears 3:1 contrast against a white *and* a near-black surface —
     * so one palette reads in both themes without a second definition, and the
     * theme switch needs no branch here. `Other` is a neutral grey of the same
     * luminance, and the interactive accent is never a data colour.
     */
    const USAGE_PALETTE = ['#287cdc', '#c06210', '#1e8d59', '#d1478c', '#9860d7', '#118896']

    /** The neutral that carries the folded remainder. */
    const USAGE_NEUTRAL = '#787c84'

    /**
     * The model id of the folded remainder. A marker, never copy: the page
     * renders it through the dictionary, so a Chinese reader sees 其他.
     */
    const USAGE_OTHER = 'other'

    /** The reasons that mean the feature is not on this profile at all. */
    const USAGE_MISSING = ['unavailable', 'no-services', 'missing']

    /** The trend chart's box, in SVG units. */
    const USAGE_CHART = { width: 720, height: 240, left: 56, right: 14, top: 16, bottom: 30 }

    /** The donut's box and stroke. */
    const USAGE_DONUT = { size: 168, radius: 62, width: 18 }

    /** One count, read without trusting the Host: a whole, non-negative number. */
    function count(value) {
      const number = Number(value)
      return Number.isFinite(number) && number > 0 ? Math.trunc(number) : 0
    }

    /**
     * One token total, with the components kept apart.
     *
     * `total` is what the Host counted, because the whole point of the page is
     * that it reports the Host's arithmetic rather than inventing its own; the
     * four components stand in only when a total is missing, so a partial answer
     * still draws something true instead of a column of zeros.
     */
    function usageTotals(raw) {
      const source = raw !== null && typeof raw === 'object' ? raw : {}
      const input = count(source.input)
      const output = count(source.output)
      const cacheRead = count(source.cacheRead)
      const cacheWrite = count(source.cacheWrite)
      const stated = count(source.total)
      return {
        input,
        output,
        cacheRead,
        cacheWrite,
        total: stated > 0 ? stated : input + output + cacheRead + cacheWrite,
        messages: count(source.messages),
        sessions: count(source.sessions),
      }
    }

    /** One model's totals, from a `byModel` entry. */
    function usageModel(raw) {
      if (raw === null || typeof raw !== 'object') return undefined
      const model = typeof raw.model === 'string' ? raw.model.trim() : ''
      if (model === '') return undefined
      return {
        model,
        provider: typeof raw.provider === 'string' ? raw.provider.trim() : '',
        ...usageTotals(raw),
      }
    }

    /** One day's totals, from a `byDay` entry. A model key's value is its total. */
    function usageDay(raw) {
      if (raw === null || typeof raw !== 'object') return undefined
      const date = typeof raw.date === 'string' ? raw.date.trim() : ''
      if (date === '') return undefined
      const byModel = {}
      const source = raw.byModel !== null && typeof raw.byModel === 'object' ? raw.byModel : {}
      for (const [name, value] of Object.entries(source)) {
        const model = String(name).trim()
        if (model !== '') byModel[model] = count(value)
      }
      return { date, byModel, total: count(raw.total) }
    }

    /** One timestamp, from a number or an ISO string. */
    function usageStamp(value) {
      if (typeof value === 'number' && Number.isFinite(value) && value > 0) return Math.trunc(value)
      if (typeof value === 'string' && value.trim() !== '') {
        const parsed = Date.parse(value)
        return Number.isFinite(parsed) ? parsed : 0
      }
      return 0
    }

    /**
     * Optional per-scope numbers.
     *
     * The contract in force answers one set of numbers over every session, which
     * is what the user asked to count. A Host that can separate subagents may add
     * `scopes: { main: { totals, byModel, byDay } }`; until it does, the page
     * says the split cannot be shown rather than pretending the toggle narrowed
     * something.
     */
    function usageScopes(raw) {
      if (raw === null || typeof raw !== 'object') return undefined
      const main = raw.main
      if (main === null || typeof main !== 'object') return undefined
      const byModel = []
      for (const entry of Array.isArray(main.byModel) ? main.byModel : []) {
        const record = usageModel(entry)
        if (record !== undefined) byModel.push(record)
      }
      const byDay = []
      for (const entry of Array.isArray(main.byDay) ? main.byDay : []) {
        const day = usageDay(entry)
        if (day !== undefined) byDay.push(day)
      }
      return { main: { totals: usageTotals(main.totals), byModel, byDay } }
    }

    /**
     * The usage view, read without trusting the Host's shape.
     *
     * A day list is sorted once here so every consumer — chart, table, footer —
     * draws the same order, and a model or day without a usable id is dropped
     * rather than rendered as an empty series.
     * @param payload - one route answer.
     * @returns the view, or `undefined` when the answer carries none.
     */
    function usageView(payload) {
      if (payload === null || typeof payload !== 'object') return undefined
      const known = ['totals', 'byModel', 'byDay', 'days', 'stats', 'backfill', 'updatedAt', 'timeZone', 'notes']
      let present = false
      for (const field of known) {
        if (Object.prototype.hasOwnProperty.call(payload, field)) present = true
      }
      if (!present) return undefined
      const byModel = []
      for (const entry of Array.isArray(payload.byModel) ? payload.byModel : []) {
        const record = usageModel(entry)
        if (record !== undefined) byModel.push(record)
      }
      const byDay = []
      for (const entry of Array.isArray(payload.byDay) ? payload.byDay : []) {
        const day = usageDay(entry)
        if (day !== undefined) byDay.push(day)
      }
      byDay.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
      const notes = []
      for (const entry of Array.isArray(payload.notes) ? payload.notes : []) {
        if (typeof entry === 'string' && entry.trim() !== '') notes.push(entry.trim())
      }
      const stats = payload.stats !== null && typeof payload.stats === 'object' ? payload.stats : {}
      const peak = stats.peakDay !== null && typeof stats.peakDay === 'object' ? stats.peakDay : {}
      const longest = stats.longestSession !== null && typeof stats.longestSession === 'object' ? stats.longestSession : {}
      const backfill = payload.backfill !== null && typeof payload.backfill === 'object' ? payload.backfill : {}
      return {
        available: payload.available !== false,
        timeZone: typeof payload.timeZone === 'string' ? payload.timeZone.trim() : '',
        totals: usageTotals(payload.totals),
        byModel,
        byDay,
        scopes: usageScopes(payload.scopes),
        stats: {
          peakDay: {
            date: typeof peak.date === 'string' ? peak.date.trim() : '',
            total: count(peak.total),
          },
          longestSession: {
            id: typeof longest.id === 'string' ? longest.id : '',
            title: typeof longest.title === 'string' ? longest.title.trim() : '',
            durationMs: count(longest.durationMs),
            startedAt: count(longest.startedAt),
          },
          currentStreakDays: count(stats.currentStreakDays),
          longestStreakDays: count(stats.longestStreakDays),
          firstDay: typeof stats.firstDay === 'string' ? stats.firstDay.trim() : '',
          lastDay: typeof stats.lastDay === 'string' ? stats.lastDay.trim() : '',
        },
        backfill: {
          state: typeof backfill.state === 'string' ? backfill.state.trim().toLowerCase() : '',
          sessionsDone: count(backfill.sessionsDone),
          sessionsTotal: count(backfill.sessionsTotal),
        },
        updatedAt: usageStamp(payload.updatedAt),
        notes,
        // Only the error-ish fields: a successful answer's `message` is not a failure.
        failure: failureText({ lastError: payload.lastError, error: payload.error, detail: payload.detail }),
      }
    }

    /** One action's outcome, read from the route's `report`. */
    function usageReport(value) {
      if (value === null || typeof value !== 'object') return undefined
      return {
        ok: value.ok === true,
        action: typeof value.action === 'string' ? value.action : '',
        reason: typeof value.reason === 'string' ? value.reason : '',
        message: typeof value.message === 'string' ? value.message.trim() : '',
      }
    }

    /**
     * The view one route answer describes.
     *
     * A `GET` answers the numbers; either `POST` answers the same numbers plus a
     * report, and the view in *that* answer is the one to adopt — the page never
     * re-reads to find out what its own action did.
     */
    function readUsageView(payload) {
      const answer = payload !== null && typeof payload === 'object' ? payload : {}
      const view = usageView(answer)
      const report = usageReport(answer.report)
      let failure = ''
      if (report !== undefined && report.ok !== true && report.message !== '') failure = report.message
      if (failure === '' && answer.ok === false) failure = failureText(answer)
      return {
        ok: view !== undefined,
        view,
        report,
        failure,
        reason: typeof answer.reason === 'string' ? answer.reason : '',
      }
    }

    /** Whether one read says the feature is absent from this profile. */
    function usageMissing(read) {
      if (read === null || typeof read !== 'object') return false
      if (read.view !== undefined && read.view !== null && read.view.available === false) return true
      return USAGE_MISSING.includes(String(read.reason ?? ''))
    }

    /**
     * Whether the page has nothing to chart.
     *
     * An empty answer is a state of its own: a chart drawn over no data would
     * have to invent an axis, and a zero line is not the same claim as "there is
     * nothing yet".
     */
    function usageEmpty(view) {
      const data = view !== null && typeof view === 'object' ? view : {}
      return usageTotals(data.totals).total === 0
    }

    /**
     * The numbers one scope contributes.
     *
     * `Main sessions only` can only narrow when the Host sent a split; without
     * one the page stays on every session and says why.
     * @param view - a `usageView` result.
     * @param scope - `all` or `main`.
     */
    function usageScope(view, scope) {
      const data = view !== null && typeof view === 'object' ? view : {}
      const split = data.scopes !== null && typeof data.scopes === 'object' ? data.scopes : undefined
      const main = scope === 'main' && split !== undefined && split.main !== undefined ? split.main : undefined
      const chosen = main !== undefined ? main : data
      return {
        supported: split !== undefined && split.main !== undefined,
        selected: main !== undefined ? 'main' : 'all',
        totals: usageTotals(chosen.totals),
        byModel: Array.isArray(chosen.byModel) ? chosen.byModel : [],
        byDay: Array.isArray(chosen.byDay) ? chosen.byDay : [],
      }
    }

    /** One `YYYY-MM-DD` as `{ year, month, day }`, or nothing when it is not a day. */
    function parseDay(date) {
      const match = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(String(date ?? ''))
      if (match === null) return undefined
      return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) }
    }

    /** One UTC date as `YYYY-MM-DD`. */
    function isoDay(date) {
      const year = date.getUTCFullYear()
      const month = String(date.getUTCMonth() + 1).padStart(2, '0')
      const day = String(date.getUTCDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    }

    /**
     * The Monday that starts one day's week, as `YYYY-MM-DD`.
     *
     * Computed in UTC from the calendar fields so the answer cannot depend on the
     * reader's clock; the Host already bucketed the days in its own zone, and the
     * page only groups those labels.
     */
    function weekStart(date) {
      const parsed = parseDay(date)
      if (parsed === undefined) return String(date ?? '')
      const utc = Date.UTC(parsed.year, parsed.month - 1, parsed.day)
      const weekday = new Date(utc).getUTCDay()
      const back = (weekday + 6) % 7
      return isoDay(new Date(utc - back * 86_400_000))
    }

    /** One bucket, with its per-model totals and the sum of them. */
    function finishBucket(bucket) {
      const values = {}
      let total = 0
      const source = bucket.values !== null && typeof bucket.values === 'object' ? bucket.values : {}
      for (const [model, value] of Object.entries(source)) {
        const amount = count(value)
        if (amount > 0) {
          values[model] = amount
          total += amount
        }
      }
      const key = String(bucket.key ?? '')
      return { key, label: key.length >= 10 ? key.slice(5) : key, values, total }
    }

    /**
     * The days, grouped the way the range control asks for.
     *
     * Daily is one bucket per day the Host sent, zeros included — a day with no
     * tokens is a real zero, not a gap. Weekly sums each week from Monday.
     * Cumulative adds every day up to that point, so the last bucket equals the
     * window's total. Nothing is smoothed and no bucket is interpolated.
     * @param data - a `usageScope` result.
     * @param range - `daily`, `weekly`, or `cumulative`.
     */
    function usageBuckets(data, range) {
      const days = data !== null && typeof data === 'object' && Array.isArray(data.byDay) ? data.byDay : []
      const mode = USAGE_RANGES.includes(range) ? range : 'daily'
      if (mode === 'weekly') {
        const weeks = new Map()
        for (const day of days) {
          const key = weekStart(day.date)
          const bucket = weeks.get(key) ?? { key, values: {} }
          for (const [model, value] of Object.entries(day.byModel)) {
            bucket.values[model] = (bucket.values[model] ?? 0) + count(value)
          }
          weeks.set(key, bucket)
        }
        return [...weeks.values()]
          .sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0))
          .map(finishBucket)
      }
      if (mode === 'cumulative') {
        const running = {}
        const buckets = []
        for (const day of days) {
          for (const [model, value] of Object.entries(day.byModel)) {
            running[model] = (running[model] ?? 0) + count(value)
          }
          buckets.push(finishBucket({ key: day.date, values: running }))
        }
        return buckets
      }
      return days.map(day => finishBucket({ key: day.date, values: day.byModel }))
    }

    /**
     * One colour per model, assigned by name.
     *
     * Assignment is in name order, never in rank order: a model that suddenly
     * grows should not repaint itself, and the same set of models always gets the
     * same colours whatever their totals are.
     * @param models - the drawn model names.
     * @returns a map of model name to a CSS colour reference.
     */
    function usagePalette(models) {
      const names = [...new Set((Array.isArray(models) ? models : [])
        .filter(name => typeof name === 'string' && name !== '' && name !== USAGE_OTHER))]
      names.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
      const colours = new Map()
      names.forEach((name, index) => {
        colours.set(name, `var(--edh-usage-${(index % USAGE_PALETTE.length) + 1})`)
      })
      return colours
    }

    /**
     * The series the charts draw: the biggest models, and the rest folded up.
     *
     * Both charts are built from this one list, so the legend, the lines and the
     * donut are guaranteed to be talking about the same models. `share` is
     * recomputed from these totals — the Host's own `share` is not read, because
     * a share of a different denominator is exactly how a donut starts lying.
     * @param buckets - a `usageBuckets` result.
     */
    function usageSeries(buckets) {
      const list = Array.isArray(buckets) ? buckets : []
      const totals = new Map()
      for (const bucket of list) {
        for (const [model, value] of Object.entries(bucket.values)) {
          totals.set(model, (totals.get(model) ?? 0) + count(value))
        }
      }
      const ranked = [...totals.entries()]
        .filter(([, total]) => total > 0)
        .sort((a, b) => (b[1] - a[1]) || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
      const drawn = ranked.slice(0, USAGE_SERIES_MAX)
      const folded = ranked.slice(USAGE_SERIES_MAX)
      const colours = usagePalette(drawn.map(([model]) => model))
      const grand = ranked.reduce((sum, [, total]) => sum + total, 0)
      const series = drawn.map(([model, total]) => ({
        model,
        other: false,
        total,
        share: grand === 0 ? 0 : total / grand,
        colour: colours.get(model) ?? 'var(--edh-usage-other)',
        values: list.map(bucket => count(bucket.values[model])),
      }))
      if (folded.length > 0) {
        const total = folded.reduce((sum, [, value]) => sum + value, 0)
        series.push({
          model: USAGE_OTHER,
          other: true,
          total,
          share: grand === 0 ? 0 : total / grand,
          colour: 'var(--edh-usage-other)',
          values: list.map(bucket => folded.reduce((sum, [model]) => sum + count(bucket.values[model]), 0)),
        })
      }
      return series
    }

    /**
     * The unit ladder for one language.
     *
     * The factors are arithmetic, so they live here; only the suffixes are copy.
     * Chinese counts by 万 and 亿, so swapping English's K/M/B would produce the
     * wrong number, not just the wrong word.
     * @param language - the active locale id, e.g. `en` or `zh`.
     * @param t - the dictionary's translate function.
     */
    function usageUnits(language, t) {
      const chinese = String(language ?? '').toLowerCase().startsWith('zh')
      const ladder = chinese
        ? [
          { factor: 1e12, key: 'usageUnitBig' },
          { factor: 1e8, key: 'usageUnitMid' },
          { factor: 1e4, key: 'usageUnitSmall' },
        ]
        : [
          { factor: 1e9, key: 'usageUnitBig' },
          { factor: 1e6, key: 'usageUnitMid' },
          { factor: 1e3, key: 'usageUnitSmall' },
        ]
      return ladder.map(unit => ({ factor: unit.factor, label: t(unit.key) }))
    }

    /**
     * One token count in the reader's units: 999, 12.4K, 120.2M, 1.6B.
     *
     * One decimal, then a bare integer when it is whole — so 120.2M keeps its
     * tenth while 1.6B does not become 1.60B. A value that rounds *up* into the
     * next unit is moved there rather than printed as `1000K`.
     * @param value - raw tokens.
     * @param units - a `usageUnits` ladder, largest factor first.
     */
    function formatTokens(value, units) {
      const whole = Math.round(Number(value))
      if (!Number.isFinite(whole) || whole <= 0) return '0'
      if (whole < 1000) return String(whole)
      const ordered = (Array.isArray(units) ? units : [])
        .filter(unit => unit !== null && typeof unit === 'object' && Number(unit.factor) > 0)
        .sort((left, right) => Number(right.factor) - Number(left.factor))
      if (ordered.length === 0) return String(whole)
      let index = ordered.findIndex(unit => whole >= Number(unit.factor))
      if (index < 0) index = ordered.length - 1
      let unit = ordered[index]
      let shown = Number((whole / Number(unit.factor)).toFixed(1))
      while (index > 0 && shown * Number(unit.factor) >= Number(ordered[index - 1].factor)) {
        index -= 1
        unit = ordered[index]
        shown = Number((whole / Number(unit.factor)).toFixed(1))
      }
      return `${String(shown)}${unit.label}`
    }

    /** One share as a percentage: `34.2%`, `50%`. */
    function formatPercent(share) {
      const value = Number(share)
      if (!Number.isFinite(value) || value <= 0) return '0%'
      return `${(value * 100).toFixed(1).replace(/\.0$/u, '')}%`
    }

    /** One session length: `2h 14m`, `14m`, `0m`. */
    function formatDuration(milliseconds, t) {
      const value = Number(milliseconds)
      if (!Number.isFinite(value) || value <= 0) return t('usageDurationZero')
      const minutes = Math.max(Math.round(value / 60_000), 1)
      const hours = Math.floor(minutes / 60)
      if (hours === 0) return t('usageDurationMinutes', { minutes })
      return t('usageDurationHours', { hours, minutes: minutes % 60 })
    }

    /** One streak, in days, as a sentence. */
    function usageDaysText(t, value) {
      const days = count(value)
      if (days === 0) return t('usageDaysNone')
      return days === 1 ? t('usageDaysOne') : t('usageDays', { count: days })
    }

    /**
     * The y-axis for one chart: a round step, and the ticks that step produces.
     *
     * The scale comes from the tallest drawn series, and only from it. An
     * all-zero window is its own case: no invented maximum, one tick at zero, and
     * every point on the baseline.
     */
    function usageScale(highest) {
      const max = count(highest)
      if (max <= 0) return { max: 0, ticks: [0] }
      const rough = max / 4
      const magnitude = 10 ** Math.floor(Math.log10(rough))
      const steps = [1, 2, 2.5, 5, 10].map(share => share * magnitude)
      const step = steps.find(candidate => candidate >= rough) ?? 10 * magnitude
      const top = Math.ceil(max / step) * step
      const ticks = []
      for (let value = 0; value <= top + step / 4; value += step) ticks.push(Math.round(value))
      return { max: Math.round(top), ticks }
    }

    /** The plot box and the x position of every bucket. */
    function usageGeometry(bucketCount) {
      const total = count(bucketCount)
      const { width, height, left, right, top, bottom } = USAGE_CHART
      const x0 = left
      const x1 = width - right
      const y0 = top
      const y1 = height - bottom
      const xs = total <= 0
        ? []
        : total === 1
          ? [(x0 + x1) / 2]
          : Array.from({ length: total }, (_, index) => x0 + (index * (x1 - x0)) / (total - 1))
      return { width, height, x0, x1, y0, y1, xs }
    }

    /** One series' points, in chart pixels, from the buckets it belongs to. */
    function usagePoints(values, geometry, scale) {
      const list = Array.isArray(values) ? values : []
      const span = scale !== null && typeof scale === 'object' ? count(scale.max) : 0
      return list.map((value, index) => {
        const x = geometry.xs[index] ?? geometry.xs[geometry.xs.length - 1] ?? geometry.x0
        const y = span > 0
          ? geometry.y1 - (count(value) / span) * (geometry.y1 - geometry.y0)
          : geometry.y1
        return { x: Math.round(x * 100) / 100, y: Math.round(y * 100) / 100 }
      })
    }

    /**
     * One polyline path through the points.
     *
     * Straight segments only: no smoothing, because a curve between two days is a
     * number the Host never counted. A single point returns an empty string — the
     * caller draws a dot instead of a degenerate path.
     */
    function usagePath(points) {
      const list = Array.isArray(points) ? points : []
      if (list.length < 2) return ''
      return list
        .map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x} ${point.y}`)
        .join(' ')
    }

    /** The dot to draw instead of a path, when the window holds a single bucket. */
    function usageDot(points) {
      const list = Array.isArray(points) ? points : []
      return list.length === 1 ? list[0] : undefined
    }

    /**
     * The donut's slices, as stroke dashes on one circle.
     *
     * Lengths are proportional to the same totals the list prints, so a slice and
     * its row always add up. A single model is one full circle; no series is no
     * ring at all.
     */
    function donutSlices(series) {
      const list = Array.isArray(series) ? series : []
      const circumference = 2 * Math.PI * USAGE_DONUT.radius
      const total = list.reduce((sum, entry) => sum + count(entry.total), 0)
      if (total === 0) return []
      let offset = 0
      const slices = []
      for (const entry of list) {
        const value = count(entry.total)
        if (value === 0) continue
        const share = value / total
        const length = share * circumference
        slices.push({
          model: entry.model,
          other: entry.other === true,
          colour: entry.colour,
          total: value,
          share,
          length,
          offset: -offset,
        })
        offset += length
      }
      return slices
    }

    /**
     * The quiet line under the charts: a history read in progress, or when the
     * numbers were last updated.
     */
    function usageFooter(view, t) {
      const data = view !== null && typeof view === 'object' ? view : {}
      const backfill = data.backfill !== null && typeof data.backfill === 'object' ? data.backfill : {}
      const done = count(backfill.sessionsDone)
      const total = count(backfill.sessionsTotal)
      const settled = ['done', 'complete', 'completed', 'finished', 'idle'].includes(String(backfill.state ?? ''))
      if (total > 0 && done < total && !settled) {
        return { kind: 'backfill', text: t('usageBackfill', { done, total }) }
      }
      const updatedAt = count(data.updatedAt)
      if (updatedAt > 0) {
        const time = formatClock(updatedAt)
        return { kind: 'updated', text: time === '' ? '' : t('usageUpdated', { time }) }
      }
      return { kind: '', text: '' }
    }

    /**
     * The page, rendered from one explicit state.
     *
     * Kept apart from the component for the same reason the Remote page is: with
     * no browser in the loop, this is the only way to see what a state actually
     * paints — and "the empty state draws no chart" is a claim about markup.
     * @param t - the dictionary's translate function.
     * @param state - the component's state plus the handlers it wired.
     */
    function usagePage(t, state) {
      const source = state !== null && typeof state === 'object' ? state : {}
      const view = source.view !== null && typeof source.view === 'object' ? source.view : {}
      const status = typeof view.status === 'string' ? view.status : 'loading'
      const data = view.data !== null && typeof view.data === 'object' ? view.data : undefined
      const units = Array.isArray(source.units) ? source.units : []
      const actions = source.actions !== null && typeof source.actions === 'object' ? source.actions : {}
      const hidden = source.hidden !== null && typeof source.hidden === 'object' ? source.hidden : {}
      const scope = source.scope === 'main' ? 'main' : 'all'
      const range = USAGE_RANGES.includes(source.range) ? source.range : 'daily'
      const busy = typeof source.busy === 'string' ? source.busy : ''
      const notice = source.notice !== null && typeof source.notice === 'object'
        ? source.notice
        : { text: '', tone: 'bad' }
      const call = (name, ...parameters) => {
        const handler = actions[name]
        if (typeof handler === 'function') handler(...parameters)
      }
      const numberText = value => formatTokens(value, units)

      const frame = (...children) => h('div', { className: 'edh-usage' },
        h('h2', { className: 'edh-usage-title' }, t('usageTitle')),
        h('p', { className: 'edh-usage-intro' }, data === undefined
          ? t('usageIntroPlain')
          : t('usageIntro', {
            zone: data.timeZone === '' ? t('usageZoneUnknown') : data.timeZone,
          })),
        ...children,
      )

      if (source.enabled === false) {
        return frame(h('p', { className: 'edh-usage-status' }, t('usageOff')))
      }

      const noticeNode = notice.text === ''
        ? []
        : [h('p', {
          className: 'edh-usage-notice',
          'data-tone': notice.tone === 'ok' ? 'ok' : 'bad',
          role: notice.tone === 'ok' ? 'status' : 'alert',
        }, notice.text)]

      if (status === 'loading') {
        return frame(...noticeNode, h('p', { className: 'edh-usage-status', role: 'status' }, t('usageLoading')))
      }

      if (status === 'error') {
        return frame(...noticeNode, h('div', { className: 'edh-usage-error', role: 'alert' },
          h('p', { className: 'edh-usage-status' }, t('usageLoadFailed')),
          typeof view.failure === 'string' && view.failure !== ''
            ? h('p', { className: 'edh-usage-failure' }, view.failure)
            : null,
          h('button', {
            type: 'button',
            className: 'edh-usage-button edh-usage-buttonPrimary',
            onClick: () => {
              call('retry')
            },
          }, t('usageRetry')),
        ))
      }

      if (status !== 'ready' || data === undefined) {
        // `unavailable` lands here: one sentence, and nothing to press.
        return frame(...noticeNode, h('p', { className: 'edh-usage-status' }, t('usageUnavailable')))
      }

      const footer = usageFooter(data, t)
      const statusText = busy === 'rebuild'
        ? t('usageRebuilding')
        : busy === 'refresh'
          ? t('usageRefreshing')
          : footer.text
      const footerNode = h('div', { className: 'edh-usage-footer' },
        h('p', { className: 'edh-usage-hint', role: 'status' }, statusText),
        h('div', { className: 'edh-usage-footerActions' },
          h('button', {
            type: 'button',
            className: 'edh-usage-button',
            disabled: busy !== '',
            'aria-busy': busy !== '' || undefined,
            onClick: () => {
              call('refresh', 'refresh')
            },
          }, t('usageRefresh')),
        ),
      )

      if (usageEmpty(data)) {
        return frame(...noticeNode,
          h('p', { className: 'edh-usage-status' }, t('usageEmpty')),
          h('div', { className: 'edh-usage-footer' },
            h('p', { className: 'edh-usage-hint', role: 'status' }, statusText),
            h('div', { className: 'edh-usage-footerActions' },
              h('button', {
                type: 'button',
                className: 'edh-usage-button',
                disabled: busy !== '',
                'aria-busy': busy !== '' || undefined,
                onClick: () => {
                  call('refresh', 'rebuild')
                },
              }, t('usageRebuild')),
            ),
          ),
        )
      }

      const scoped = usageScope(data, scope)
      const buckets = usageBuckets(scoped, range)
      const series = usageSeries(buckets)
      const geometry = usageGeometry(buckets.length)
      const shown = series.filter(entry => hidden[entry.model] !== true)
      const highest = shown.reduce((max, entry) => Math.max(max, ...entry.values, 0), 0)
      const scale = usageScale(highest)
      const yOf = value => (scale.max > 0
        ? geometry.y1 - (value / scale.max) * (geometry.y1 - geometry.y0)
        : geometry.y1)

      const stats = data.stats !== null && typeof data.stats === 'object' ? data.stats : {}
      const peak = stats.peakDay !== null && typeof stats.peakDay === 'object' ? stats.peakDay : {}
      const longest = stats.longestSession !== null && typeof stats.longestSession === 'object' ? stats.longestSession : {}
      const cells = [
        {
          key: 'total',
          label: t('usageStatTotal'),
          figure: numberText(data.totals.total),
          note: t('usageStatTotalNote', {
            messages: data.totals.messages,
            sessions: data.totals.sessions,
          }),
        },
        {
          key: 'peak',
          label: t('usageStatPeak'),
          figure: count(peak.total) > 0 ? numberText(peak.total) : '—',
          note: typeof peak.date === 'string' && peak.date !== '' ? peak.date : t('usageStatPeakNote'),
        },
        {
          key: 'longest',
          label: t('usageStatLongest'),
          figure: count(longest.durationMs) > 0 ? formatDuration(longest.durationMs, t) : '—',
          note: typeof longest.title === 'string' && longest.title !== ''
            ? longest.title
            : t('usageStatLongestNote'),
        },
        {
          key: 'streak',
          label: t('usageStatStreak'),
          figure: usageDaysText(t, stats.currentStreakDays),
          note: '',
        },
        {
          key: 'longest-streak',
          label: t('usageStatLongestStreak'),
          figure: usageDaysText(t, stats.longestStreakDays),
          note: '',
        },
      ]

      const statRow = h('div', { className: 'edh-usage-stats' }, cells.map(cell => h('div', {
        key: cell.key,
        className: 'edh-usage-stat',
      },
        h('span', { className: 'edh-usage-statFigure' }, cell.figure),
        h('span', { className: 'edh-usage-statLabel' }, cell.label),
        cell.note === '' ? null : h('span', { className: 'edh-usage-statNote', title: cell.note }, cell.note),
      )))

      if (buckets.length === 0) {
        return frame(...noticeNode, statRow, h('p', { className: 'edh-usage-status' }, t('usageEmptyRange')), footerNode)
      }

      const chartLabel = t('usageChartLabel', {
        range: t(`usageRange${range.charAt(0).toUpperCase()}${range.slice(1)}`),
        from: buckets[0].key,
        to: buckets[buckets.length - 1].key,
        models: series.length === 1 ? t('usageChartLabelOne') : t('usageChartLabelMany', { count: series.length }),
      })

      /** The name one series is shown under: a model id, or the folded remainder. */
      const seriesLabel = entry => (entry.other === true ? t('usageOther') : entry.model)

      const legend = h('div', { className: 'edh-usage-legend', role: 'group', 'aria-label': t('usageTrendTitle') },
        series.map(entry => h('button', {
          key: entry.model,
          type: 'button',
          className: 'edh-usage-legendItem',
          'aria-pressed': hidden[entry.model] !== true,
          onClick: () => {
            call('toggle', entry.model)
          },
        },
          h('span', { className: 'edh-usage-chip', style: { background: entry.colour }, 'aria-hidden': true }),
          h('span', null, seriesLabel(entry)),
        )))

      const labelEvery = buckets.length <= 6 ? 1 : Math.ceil(buckets.length / 6)
      const chart = h('svg', {
        className: 'edh-usage-chart',
        viewBox: `0 0 ${geometry.width} ${geometry.height}`,
        preserveAspectRatio: 'xMidYMid meet',
        role: 'img',
        'aria-label': chartLabel,
      },
        scale.ticks.map(tick => h('g', { key: `tick-${tick}` },
          h('line', {
            className: 'edh-usage-grid',
            x1: geometry.x0,
            x2: geometry.x1,
            y1: yOf(tick),
            y2: yOf(tick),
          }),
          h('text', {
            className: 'edh-usage-axis',
            x: geometry.x0 - 8,
            y: yOf(tick) + 3,
            textAnchor: 'end',
          }, numberText(tick)),
        )),
        buckets.map((bucket, index) => (index % labelEvery === 0 || index === buckets.length - 1
          ? h('text', {
            key: `day-${bucket.key}`,
            className: 'edh-usage-axis',
            x: geometry.xs[index],
            y: geometry.y1 + 16,
            textAnchor: 'middle',
          }, bucket.label)
          : null)),
        h('line', {
          className: 'edh-usage-baseline',
          x1: geometry.x0,
          x2: geometry.x1,
          y1: geometry.y1,
          y2: geometry.y1,
        }),
        shown.map(entry => {
          const points = usagePoints(entry.values, geometry, scale)
          const dot = usageDot(points)
          const path = usagePath(points)
          return h('g', { key: entry.model },
            path === ''
              ? null
              : h('path', {
                d: path,
                fill: 'none',
                stroke: entry.colour,
                strokeWidth: 2,
                strokeLinejoin: 'round',
                strokeLinecap: 'round',
              }),
            dot === undefined
              ? null
              : h('circle', { cx: dot.x, cy: dot.y, r: 3, fill: entry.colour }),
          )
        }),
      )

      // The same numbers, for a reader who cannot see the lines.
      const chartTable = h('table', { className: 'edh-usage-sr' },
        h('caption', null, chartLabel),
        h('thead', null, h('tr', null,
          h('th', { scope: 'col' }, t('usageTrendTitle')),
          shown.map(entry => h('th', { key: entry.model, scope: 'col' }, seriesLabel(entry))),
        )),
        h('tbody', null, buckets.map((bucket, index) => h('tr', { key: bucket.key },
          h('th', { scope: 'row' }, bucket.key),
          shown.map(entry => h('td', { key: entry.model }, numberText(entry.values[index] ?? 0))),
        ))),
      )

      const slices = donutSlices(series)
      const circumference = 2 * Math.PI * USAGE_DONUT.radius
      const centre = USAGE_DONUT.size / 2
      const donutLabel = t('usageDonutLabel', {
        models: series.map(entry => seriesLabel(entry)).join(', '),
        total: numberText(data.totals.total),
      })
      const donut = h('svg', {
        className: 'edh-usage-donut',
        viewBox: `0 0 ${USAGE_DONUT.size} ${USAGE_DONUT.size}`,
        role: 'img',
        'aria-label': donutLabel,
      },
        h('circle', {
          className: 'edh-usage-donutTrack',
          cx: centre,
          cy: centre,
          r: USAGE_DONUT.radius,
          fill: 'none',
          strokeWidth: USAGE_DONUT.width,
        }),
        slices.map(slice => h('circle', {
          key: slice.model,
          cx: centre,
          cy: centre,
          r: USAGE_DONUT.radius,
          fill: 'none',
          stroke: slice.colour,
          strokeWidth: USAGE_DONUT.width,
          strokeDasharray: `${slice.length} ${circumference - slice.length}`,
          strokeDashoffset: slice.offset,
          transform: `rotate(-90 ${centre} ${centre})`,
        })),
        h('text', {
          className: 'edh-usage-donutTotal',
          x: centre,
          y: centre + 2,
          textAnchor: 'middle',
        }, numberText(data.totals.total)),
        h('text', {
          className: 'edh-usage-donutUnit',
          x: centre,
          y: centre + 18,
          textAnchor: 'middle',
        }, t('usageDonutCentre')),
      )

      const modelList = h('ul', { className: 'edh-usage-models' }, series.map(entry => h('li', {
        key: entry.model,
        className: 'edh-usage-model',
        'data-other': entry.other ? 'true' : undefined,
      },
        h('span', { className: 'edh-usage-chip', style: { background: entry.colour }, 'aria-hidden': true }),
        h('span', { className: 'edh-usage-modelText' },
          h('span', { className: 'edh-usage-modelName', title: seriesLabel(entry) }, seriesLabel(entry)),
          h('span', { className: 'edh-usage-modelTokens' }, `${numberText(entry.total)} ${t('usageTokens')}`),
        ),
        h('span', { className: 'edh-usage-modelShare' }, formatPercent(entry.share)),
      )))

      const group = (label, key, options) => h('div', { className: 'edh-usage-group', role: 'group', 'aria-label': label },
        h('span', { className: 'edh-usage-groupLabel' }, label),
        options.map(option => h('button', {
          key: option.value,
          type: 'button',
          className: 'edh-usage-option',
          'aria-pressed': option.selected,
          disabled: option.disabled === true,
          onClick: () => {
            call(key, option.value)
          },
        }, option.label)),
      )

      const filters = h('div', { className: 'edh-usage-filters' },
        group(t('usageScopeLabel'), 'scope', USAGE_SCOPES.map(value => ({
          value,
          label: value === 'main' ? t('usageScopeMain') : t('usageScopeAll'),
          selected: scoped.selected === value,
          disabled: value === 'main' && !scoped.supported,
        }))),
        group(t('usageRangeLabel'), 'range', USAGE_RANGES.map(value => ({
          value,
          label: t(`usageRange${value.charAt(0).toUpperCase()}${value.slice(1)}`),
          selected: range === value,
          disabled: false,
        }))),
      )

      return frame(...noticeNode,
        statRow,
        h('section', { className: 'edh-usage-block' },
          h('h3', { className: 'edh-usage-blockTitle' }, t('usageTrendTitle')),
          legend,
          chart,
          chartTable,
        ),
        h('section', { className: 'edh-usage-block' },
          h('h3', { className: 'edh-usage-blockTitle' }, t('usageModelsTitle')),
          h('div', { className: 'edh-usage-donutWrap' }, donut, modelList),
        ),
        filters,
        h('p', { className: 'edh-usage-hint' }, t('usageRangeNote')),
        scoped.supported ? null : h('p', { className: 'edh-usage-hint' }, t('usageScopeNote')),
        data.notes.map((note, index) => h('p', { key: `note-${index}`, className: 'edh-usage-note' }, note)),
        footerNode,
      )
    }

    /**
     * The usage page: the numbers, two charts, the filters, and one refresh.
     *
     * It reads the `usage` row's own enablement rather than the aggregate: the
     * row is what mounts the route behind it. The nav entry is gated the same way
     * where it is registered; this is the answer for the case registration cannot
     * cover, a row switched off while the page is open.
     * @param t - the dictionary's translate function.
     * @param controller - the switch controller holding the row states.
     * @param locale - the locale service, read for the number ladder; optional.
     */
    function createUsagePage(t, controller, locale) {
      const useUsageEnabled = createFeatureHook(controller, USAGE_MODULE, rowEnabled)

      return function EdhUsagePage() {
        const enabled = useUsageEnabled()
        const [view, setView] = React.useState(() => ({ status: 'loading', data: undefined, failure: '' }))
        const [attempt, setAttempt] = React.useState(0)
        const [scope, setScope] = React.useState('all')
        const [range, setRange] = React.useState('daily')
        const [hidden, setHidden] = React.useState({})
        const [busy, setBusy] = React.useState('')
        const [notice, setNotice] = React.useState({ text: '', tone: 'bad' })

        const language = locale !== undefined && typeof locale?.getSnapshot === 'function'
          ? locale.getSnapshot().active
          : ''
        const units = usageUnits(language, t)

        // Read once on mount and once per retry. A refresh is a write, and its
        // answer carries the new numbers, so the page never polls.
        React.useEffect(() => {
          if (!enabled) return undefined
          let current = true
          setView(previous => ({ status: 'loading', data: previous.data, failure: '' }))
          void (async () => {
            let answer
            try {
              answer = await requestUsage('GET')
            } catch (error) {
              if (!current) return
              const missing = error?.status === 404 || error?.status === 405
              usageWrite({
                phase: 'failed',
                action: 'read',
                reason: missing ? 'route-missing' : 'error',
                message: messageOf(error),
              })
              setView({
                status: missing ? 'unavailable' : 'error',
                data: undefined,
                failure: missing ? '' : messageOf(error),
              })
              return
            }
            if (!current) return
            const read = readUsageView(answer)
            if (!read.ok || (read.view !== undefined && read.view.available === false)) {
              const missing = usageMissing(read)
              usageWrite({
                phase: 'failed',
                action: 'read',
                reason: missing ? 'unavailable' : String(read.reason || 'error'),
                message: read.failure,
              })
              setView({ status: missing ? 'unavailable' : 'error', data: undefined, failure: read.failure })
              return
            }
            usageWrite({
              phase: 'loaded',
              total: read.view.totals.total,
              models: read.view.byModel.length,
              days: read.view.byDay.length,
              sessions: read.view.totals.sessions,
            })
            setView({
              status: 'ready',
              data: read.failure === '' ? read.view : { ...read.view, failure: read.failure },
              failure: read.failure,
            })
          })()
          return () => {
            current = false
          }
        }, [enabled, attempt])

        /**
         * One action on the route. The answer's view replaces the one on screen;
         * there is no second read afterwards.
         * @returns the adopted read, or `undefined` when no answer arrived.
         */
        const send = React.useCallback(async action => {
          setBusy(action)
          setNotice({ text: '', tone: 'bad' })
          let answer
          try {
            answer = await requestUsage('POST', { action })
          } catch (error) {
            usageWrite({ phase: 'failed', action, reason: 'error', message: messageOf(error) })
            setBusy('')
            setNotice({ text: messageOf(error), tone: 'bad' })
            return undefined
          }
          setBusy('')
          const read = readUsageView(answer)
          if (read.ok) {
            setView({
              status: 'ready',
              data: read.failure === '' ? read.view : { ...read.view, failure: read.failure },
              failure: read.failure,
            })
          }
          const rejected = read.report !== undefined && read.report.ok !== true
          if (rejected || !read.ok) {
            const text = read.failure !== ''
              ? read.failure
              : t('usageActionFailed')
            setNotice({ text, tone: 'bad' })
            usageWrite({
              phase: 'failed',
              action,
              reason: String(read.report?.reason ?? read.reason ?? 'error'),
              message: text,
            })
            return { read, ok: false }
          }
          usageWrite({ phase: 'refreshed', action, total: read.view.totals.total })
          return { read, ok: true }
        }, [t])

        const onRetry = React.useCallback(() => {
          setAttempt(value => value + 1)
        }, [])

        const onRefresh = React.useCallback(action => {
          void send(action === 'rebuild' ? 'rebuild' : 'refresh')
        }, [send])

        const onScope = React.useCallback(value => {
          setScope(value === 'main' ? 'main' : 'all')
        }, [])

        const onRange = React.useCallback(value => {
          setRange(USAGE_RANGES.includes(value) ? value : 'daily')
        }, [])

        const onToggle = React.useCallback(model => {
          setHidden(previous => {
            const next = { ...previous }
            if (next[model] === true) delete next[model]
            else next[model] = true
            return next
          })
        }, [])

        return usagePage(t, {
          enabled,
          view,
          scope,
          range,
          hidden,
          busy,
          notice,
          units,
          actions: {
            retry: onRetry,
            refresh: onRefresh,
            scope: onScope,
            range: onRange,
            toggle: onToggle,
          },
        })
      }
    }

    /**
     * The page's stylesheet.
     *
     * Rows and hairlines again, not cards: a dashboard is a set of figures and
     * two charts, and the only fill is the one the segmented control already
     * uses. The palette variables are declared here, on the page root, so a
     * series colour and its chip are always the same value.
     */
    const USAGE_CSS = [
      `.edh-usage{${[
        `--edh-usage-other:${USAGE_NEUTRAL}`,
        ...USAGE_PALETTE.map((colour, index) => `--edh-usage-${index + 1}:${colour}`),
      ].join(';')};color:var(--dsw-alias-label-primary);flex-direction:column;gap:14px;max-width:880px;display:flex}`,
      '.edh-usage-title{margin:0;font-size:16px;font-weight:500;line-height:24px}',
      '.edh-usage-intro{color:var(--dsw-alias-label-tertiary);margin:0;font-size:14px;line-height:22px}',
      '.edh-usage-status{color:var(--dsw-alias-label-tertiary);margin:0;font-size:13px;line-height:20px}',
      '.edh-usage-error{flex-direction:column;align-items:flex-start;gap:10px;display:flex}',
      '.edh-usage-failure{color:var(--dsw-alias-state-error-primary);margin:0;font-size:12px;line-height:18px}',
      '.edh-usage-notice{color:var(--dsw-alias-label-secondary);margin:0;font-size:12px;line-height:18px}',
      '.edh-usage-notice[data-tone=bad]{color:var(--dsw-alias-state-error-primary)}',
      '.edh-usage-notice[data-tone=ok]{color:var(--dsw-alias-state-success-primary)}',
      '.edh-usage-stats{border-top:.5px solid var(--dsw-alias-border-l2);border-bottom:.5px solid var(--dsw-alias-border-l2);grid-template-columns:repeat(5,minmax(0,1fr));display:grid}',
      '.edh-usage-stat{border-left:.5px solid var(--dsw-alias-border-l2);flex-direction:column;gap:2px;min-width:0;padding:12px 16px;display:flex}',
      '.edh-usage-stat:first-child{border-left:none;padding-left:0}',
      '.edh-usage-stat:last-child{padding-right:0}',
      '.edh-usage-statFigure{font-size:22px;font-weight:500;line-height:28px;font-variant-numeric:tabular-nums;white-space:nowrap;text-overflow:ellipsis;overflow:hidden}',
      '.edh-usage-statLabel{color:var(--dsw-alias-label-secondary);font-size:12px;line-height:18px}',
      '.edh-usage-statNote{color:var(--dsw-alias-label-tertiary);white-space:nowrap;text-overflow:ellipsis;overflow:hidden;font-size:11px;line-height:16px}',
      '.edh-usage-block{flex-direction:column;gap:8px;display:flex}',
      '.edh-usage-blockTitle{color:var(--dsw-alias-label-primary);margin:0;font-size:13px;font-weight:500;line-height:20px}',
      '.edh-usage-legend{flex-wrap:wrap;align-items:center;gap:4px 6px;display:flex}',
      '.edh-usage-legendItem{color:var(--dsw-alias-label-secondary);cursor:pointer;background:0 0;border:none;border-radius:var(--dsw-radius-sm);align-items:center;gap:6px;height:24px;padding:0 8px;font:inherit;font-size:12px;line-height:18px;display:inline-flex}',
      '.edh-usage-legendItem:hover{background:var(--dsw-alias-interactive-bg-hover)}',
      '.edh-usage-legendItem[aria-pressed=false]{opacity:.45}',
      '.edh-usage-legendItem[aria-pressed=false]:hover{opacity:.7}',
      '.edh-usage-chip{border-radius:2px;flex:none;width:8px;height:8px;display:inline-block}',
      '.edh-usage-chart{width:100%;height:auto;display:block}',
      '.edh-usage-grid{stroke:var(--dsw-alias-border-l2);stroke-width:1}',
      '.edh-usage-baseline{stroke:var(--dsw-alias-border-l3);stroke-width:1}',
      '.edh-usage-axis{fill:var(--dsw-alias-label-tertiary);font-size:10px;font-variant-numeric:tabular-nums}',
      '.edh-usage-donutWrap{align-items:center;gap:24px;display:flex}',
      '.edh-usage-donut{flex:none;width:168px;height:168px}',
      '.edh-usage-donutTrack{stroke:var(--dsw-alias-bg-layer-2)}',
      '.edh-usage-donutTotal{fill:var(--dsw-alias-label-primary);font-size:17px;font-weight:500;font-variant-numeric:tabular-nums}',
      '.edh-usage-donutUnit{fill:var(--dsw-alias-label-tertiary);font-size:10px}',
      '.edh-usage-models{flex-direction:column;flex:1;gap:0;min-width:0;margin:0;padding:0;list-style:none;display:flex}',
      '.edh-usage-model{border-bottom:.5px solid var(--dsw-alias-border-l2);grid-template-columns:8px minmax(0,1fr) max-content;align-items:center;gap:0 10px;padding:7px 0;display:grid}',
      '.edh-usage-model:last-child{border-bottom:none}',
      '.edh-usage-modelText{flex-direction:column;min-width:0;display:flex}',
      '.edh-usage-modelName{white-space:nowrap;text-overflow:ellipsis;overflow:hidden;font-size:13px;line-height:19px}',
      '.edh-usage-modelTokens{color:var(--dsw-alias-label-tertiary);font-size:11px;line-height:16px;font-variant-numeric:tabular-nums}',
      '.edh-usage-modelShare{color:var(--dsw-alias-label-secondary);font-size:13px;line-height:19px;font-variant-numeric:tabular-nums}',
      '.edh-usage-filters{flex-wrap:wrap;align-items:center;gap:8px 20px;display:flex}',
      '.edh-usage-group{background:var(--dsw-alias-bg-layer-2);border-radius:var(--dsw-radius-sm);align-items:center;gap:2px;padding:2px;display:inline-flex}',
      '.edh-usage-groupLabel{color:var(--dsw-alias-label-tertiary);padding:0 6px;font-size:12px;line-height:18px}',
      '.edh-usage-option{color:var(--dsw-alias-label-secondary);cursor:pointer;background:0 0;border:none;border-radius:var(--dsw-radius-xs);height:24px;padding:0 10px;font:inherit;font-size:12px;line-height:18px}',
      '.edh-usage-option[aria-pressed=true]{background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);box-shadow:var(--dsw-shadow-lv1)}',
      '.edh-usage-option:disabled{cursor:not-allowed;opacity:.4}',
      '.edh-usage-hint{color:var(--dsw-alias-label-tertiary);margin:0;font-size:12px;line-height:18px}',
      '.edh-usage-note{color:var(--dsw-alias-label-tertiary);margin:0;font-size:11px;line-height:17px}',
      '.edh-usage-footer{border-top:.5px solid var(--dsw-alias-border-l2);justify-content:space-between;align-items:center;gap:12px;padding-top:10px;display:flex}',
      '.edh-usage-footerActions{justify-content:flex-end;align-items:center;gap:8px;display:flex}',
      '.edh-usage-button{box-sizing:border-box;color:var(--dsw-alias-label-secondary);cursor:pointer;background:0 0;border:none;border-radius:var(--dsw-radius-sm);justify-content:center;align-items:center;gap:4px;height:28px;padding:0 10px;font:inherit;font-size:12px;line-height:18px;white-space:nowrap;display:inline-flex}',
      '.edh-usage-button:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover)}',
      '.edh-usage-button:active:not(:disabled){background:var(--dsw-alias-interactive-bg-active)}',
      '.edh-usage-button:disabled{cursor:not-allowed;opacity:.4}',
      '.edh-usage-buttonPrimary{background:var(--dsw-alias-button-primary-fill);color:var(--dsw-alias-label-primary-foreground)}',
      '.edh-usage-buttonPrimary:hover:not(:disabled){background:var(--dsw-alias-button-primary-hover)}',
      '.edh-usage-sr{position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;white-space:nowrap;border:0;clip:rect(0 0 0 0)}',
      '.edh-usage :is(button,input,textarea,a):focus-visible{outline:var(--dsw-focus-ring-width) solid var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary));outline-offset:2px}',
    ].join('')

    /** Install the usage page stylesheet once and take it back out on dispose. */
    function installUsageStyles() {
      if (typeof document === 'undefined') return () => {}
      const selector = 'style[data-edh-css="usage"]'
      if (document.querySelector(selector) === null) {
        const tag = document.createElement('style')
        tag.dataset.edhCss = 'usage'
        tag.dataset.plugin = '@moreweb/edh'
        tag.textContent = USAGE_CSS
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
    // The mobile layer
    //
    // The browser half runs inside the page it is improving, so the phone
    // experience is a head change rather than proxy surgery: a viewport that
    // opts into the notch, the web-app metas, the manifest the Host serves, and
    // one stylesheet. Remote proxies this same page, so a phone inherits all of
    // it without the proxy knowing anything about it.
    //
    // Every change is reversible by construction: an attribute this layer set is
    // remembered with its previous value (and whether it existed at all), a node
    // it created is remembered by reference, and disposal puts the document back
    // exactly as it was found. Turning the row off must leave no trace.
    // ---------------------------------------------------------------------

    /** The row that governs the whole mobile layer. */
    const MOBILE_MODULE = '@moreweb/edh/mobile'

    /** The viewport content that makes a phone lay this page out at device width. */
    const MOBILE_VIEWPORT = 'width=device-width, initial-scale=1, viewport-fit=cover'

    /** The Host's manifest, document-relative so it follows whatever origin serves the page. */
    const MOBILE_MANIFEST = 'api/edh.mobile/manifest'

    /** The Host's opaque 180x180 touch icon: iOS ignores SVG, so this one is rendered. */
    const MOBILE_TOUCH_ICON = 'api/edh.mobile/icon?size=180'

    /**
     * The Host's pass-through worker. It intercepts nothing; it exists only
     * because Chrome will not offer to install a page without a worker that has a
     * `fetch` handler, and the user fronts Remote with their own HTTPS proxy, so
     * the origin is already a secure context.
     */
    const MOBILE_WORKER = 'api/edh.mobile/sw.js'
    /** Root scope on purpose: at `/api/edh.mobile/` the page is outside it. */
    const MOBILE_WORKER_SCOPE = '/'
    /** One registration per page load, shared by every layer instance. */
    const MOBILE_WORKER_STATE = { asked: false }

    /** Every phone rule runs under this query: a desktop window never sees them. */
    const MOBILE_QUERY = '(max-width: 860px)'

    /**
     * Two media-qualified tags, so the browser chrome follows the scheme the
     * reader's phone is in. The dark value is the Host manifest's own dark
     * surface, so the meta and the manifest cannot disagree about the same app.
     */
    const MOBILE_THEME = [['light', '#ffffff'], ['dark', '#0b0c0e']]

    /** The web-app metas. All three are the shipped spelling, not a rewrite. */
    const MOBILE_META = [
      ['mobile-web-app-capable', 'yes'],
      ['apple-mobile-web-app-capable', 'yes'],
      ['apple-mobile-web-app-status-bar-style', 'black-translucent'],
      // iOS uses this as the home-screen label; without it the label is derived
      // from the document title, which is long enough to be cut.
      ['apple-mobile-web-app-title', 'EDH'],
    ]

    /**
     * The phone stylesheet, in the two blocks the layer means by them.
     *
     * Safe: things that can only help or are ignored — text sizing, scroll
     * chaining, tap behaviour, the 16px floor that stops iOS zooming on focus,
     * and the notch padding. Layout: the thumb-sized targets, momentum
     * scrolling, slim scrollbars. Every selector is a tag, an id, a role or an
     * attribute: the shell's class names are hashed module names, and a guessed
     * hash is a selector that breaks the day the shell rebuilds.
     */
    const MOBILE_CSS = [
      `@media ${MOBILE_QUERY}{`,
      // --- safe -------------------------------------------------------------
      'html{-webkit-text-size-adjust:100%;text-size-adjust:100%}',
      'body{overscroll-behavior-y:contain}',
      '*,*:before,*:after{-webkit-tap-highlight-color:rgba(127,127,127,.18)}',
      'input,textarea,select{font-size:max(16px,1em)}',
      'button,a,[role=button],[role=tab],[role=menuitem],input,select,textarea{touch-action:manipulation}',
      '#root{box-sizing:border-box;height:100dvh;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)}',
      // --- layout -----------------------------------------------------------
      'button,[role=button],[role=tab],[role=menuitem]{min-height:44px;min-width:44px}',
      'a{min-height:44px}',
      '#root *{-webkit-overflow-scrolling:touch}',
      '::-webkit-scrollbar{width:6px;height:6px}',
      '::-webkit-scrollbar-thumb{border-radius:999px}',
      'textarea{line-height:1.5}',
      // --- dialogs ----------------------------------------------------------
      // For real modals: settings, shortcuts, workspace dialogs. `max-height` and
      // never `height`, so a short dialog keeps its natural size and never grows
      // a scrollbar; `dvh` accounts for a collapsing toolbar; the `dialog`
      // selector covers a native `showModal` dialog too.
      //
      // These rules do NOT cover the ask card: it carries no `role="dialog"` and
      // no `aria-modal` — it is a chain takeover of the composer. That one is
      // fixed at the end of this sheet, outside the query.
      '[role=dialog],[aria-modal=true],dialog{max-height:calc(100dvh - 32px);overflow-y:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch}',
      // A flex child will not shrink below its content unless it is allowed to,
      // and then the inner column is taller than the box meant to scroll it.
      '[role=dialog] *,[aria-modal=true] *,dialog *{min-height:0}',
      // The action row must stay inside the dialog: no child may push it out.
      '[role=dialog] > *,[aria-modal=true] > *,dialog > *{flex:0 1 auto}',
      '}',
      // --- the ask card ------------------------------------------------------
      // Not mobile-specific: the card is a chain takeover of the composer, so
      // these rules sit at top level, outside the media query. It clips because
      // the card is the only overflow surface and it is `hidden`: a long question
      // fills a non-shrinking header, the real scroller is squeezed to zero, and
      // the action row is pushed outside the card. So the card becomes the
      // scroller instead. Every selector is an attribute or element literal from
      // the shipped JSX, and (0,1,1) / (0,1,2) already outrank the hashed module
      // classes, so this sheet needs no !important anywhere.
      '[data-question-key] > section:has(> footer){max-height:min(60vh,520px);max-height:min(60svh,520px);overflow-y:auto;overflow-x:hidden;scroll-padding-bottom:64px}',
      '[data-question-key] [data-question-scroll]{flex:0 0 auto;min-height:0;overflow:visible}',
      '[data-question-key] > section > footer{position:sticky;bottom:0;z-index:1;margin-top:0;padding-top:12px;background:var(--dsw-specific-input-major,var(--dsw-alias-bg-base))}',
    ].join('')

    /**
     * Register the pass-through worker, once per page load, or say why not.
     *
     * Three gates, in order: no `navigator.serviceWorker` (a browser that has none),
     * not a secure context (the plain-http LAN case — the silent skip that matters),
     * and already asked (a dispose/reinstall cycle). Registration is fire-and-forget
     * and every outcome is a breadcrumb: a rejection must never reach the page, and
     * nothing here ever unregisters — the worker is an origin-level resource, not
     * ours to tear down because a feature row was toggled.
     * @param options - the injectable environment, for the suite.
     * @returns whether a registration was attempted.
     */
    function registerMobileWorker(options = {}) {
      const write = typeof options.write === 'function' ? options.write : mobileWrite
      const nav = options.navigator ?? (typeof navigator === 'undefined' ? undefined : navigator)
      const secure = options.secureContext ?? (typeof window === 'undefined' ? undefined : window.isSecureContext)
      const state = options.state ?? MOBILE_WORKER_STATE
      // One ask per page load, whatever it answers: a skip is reported once too,
      // so a dispose/reinstall cycle cannot repeat the breadcrumb.
      if (state.asked === true) return false
      state.asked = true
      if (nav === undefined || nav === null || nav.serviceWorker === undefined || nav.serviceWorker === null) {
        write({ phase: 'sw-skipped', reason: 'unsupported' })
        return false
      }
      if (secure !== true) {
        write({ phase: 'sw-skipped', reason: 'insecure' })
        return false
      }
      try {
        void nav.serviceWorker
          .register(MOBILE_WORKER, { scope: MOBILE_WORKER_SCOPE })
          .then(registration => {
            const scope = registration !== null && typeof registration === 'object' && typeof registration.scope === 'string'
              ? registration.scope
              : MOBILE_WORKER_SCOPE
            write({ phase: 'sw-registered', scope })
          })
          .catch(error => write({ phase: 'sw-failed', reason: messageOf(error) }))
      } catch (error) {
        // A synchronous refusal (a policy, a malformed URL) is the same outcome.
        write({ phase: 'sw-failed', reason: messageOf(error) })
      }
      return true
    }

    /**
     * The mobile layer, as a small reversible change set.
     *
     * `apply` is idempotent: a second call while applied changes nothing, so a
     * re-sync that fires twice cannot duplicate a tag. `withdraw` undoes exactly
     * what this instance did — it never removes a node it did not add, and never
     * restores an attribute it did not touch.
     * @param doc - the document to change; injected so the suite can drive it.
     * @returns `{ apply, withdraw, applied }`, or `undefined` without a document.
     */
    function createMobileLayer(doc, env = {}) {
      if (doc === undefined || doc === null || typeof doc.createElement !== 'function') return undefined
      if (doc.head === undefined || doc.head === null) return undefined
      /** Nodes this layer created, in creation order. */
      const created = []
      /** Attributes this layer changed, with what they were before. */
      const touched = []
      let active = false

      const find = selector => (typeof doc.querySelector === 'function' ? doc.querySelector(selector) : null)
      const make = (tag, attributes) => {
        const element = doc.createElement(tag)
        for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, value)
        return element
      }
      const add = element => {
        doc.head.appendChild(element)
        created.push(element)
        return element
      }
      /** Set an attribute on a node that was already there, remembering its old state. */
      const upgrade = (element, attribute, value) => {
        touched.push({
          element,
          attribute,
          present: typeof element.hasAttribute === 'function' ? element.hasAttribute(attribute) : element.getAttribute(attribute) !== null,
          value: element.getAttribute(attribute),
        })
        element.setAttribute(attribute, value)
      }

      const apply = () => {
        if (active) return false
        active = true
        // The viewport is upgraded in place: a page never gets a second one.
        const viewport = find('meta[name="viewport"]')
        if (viewport !== null) upgrade(viewport, 'content', MOBILE_VIEWPORT)
        else add(make('meta', { name: 'viewport', content: MOBILE_VIEWPORT }))
        for (const [scheme, colour] of MOBILE_THEME) {
          add(make('meta', { name: 'theme-color', media: `(prefers-color-scheme: ${scheme})`, content: colour }))
        }
        for (const [name, content] of MOBILE_META) add(make('meta', { name, content }))
        // The manifest is upgraded in place too: the shell ships one.
        const manifest = find('link[rel="manifest"]')
        if (manifest !== null) upgrade(manifest, 'href', MOBILE_MANIFEST)
        else add(make('link', { rel: 'manifest', href: MOBILE_MANIFEST, id: 'edh-mobile-manifest' }))
        // iOS needs a raster touch icon and the Host renders one: it ignores SVG,
        // and with no touch icon at all it screenshots the page for the home
        // screen. This is an addition, so withdrawal removes it.
        add(make('link', {
          rel: 'apple-touch-icon',
          sizes: '180x180',
          href: MOBILE_TOUCH_ICON,
          id: 'edh-mobile-icon',
        }))
        const style = make('style', { id: 'edh-mobile' })
        style.textContent = MOBILE_CSS
        add(style)
        // Last, and outside any render path: the worker is an origin-level
        // resource, so it is registered once per page load and never withdrawn.
        registerMobileWorker({
          write: env.write,
          navigator: env.navigator,
          secureContext: env.secureContext,
          state: env.workerState,
        })
        return true
      }

      const withdraw = () => {
        if (!active) return false
        active = false
        while (created.length > 0) {
          const node = created.pop()
          if (node !== undefined && node.parentNode !== null && node.parentNode !== undefined) node.parentNode.removeChild(node)
        }
        while (touched.length > 0) {
          const entry = touched.pop()
          if (entry === undefined) continue
          if (entry.present) entry.element.setAttribute(entry.attribute, entry.value)
          else entry.element.removeAttribute(entry.attribute)
        }
        return true
      }

      return { apply, withdraw, applied: () => active }
    }

    /**
     * Install the mobile layer and keep it in step with its row.
     *
     * One effect owns the whole layer: the first sync decides whether it is on,
     * every controller change re-syncs, and disposal withdraws it — so turning
     * the row off leaves the document exactly as it was found, and turning it
     * back on applies it again.
     * @param ctx - the browser plugin context.
     * @param controller - the switch controller holding the row states.
     * @param doc - the document; defaults to the real one.
     */
    function installMobileLayer(ctx, controller, doc = (typeof document === 'undefined' ? undefined : document), env = {}) {
      const layer = createMobileLayer(doc, env)
      if (layer === undefined) return () => {}
      ctx.effect(() => {
        let active = false
        /** Apply or withdraw, so the document matches the row right now. */
        const sync = () => {
          const wanted = rowEnabled(controller.getSnapshot(), MOBILE_MODULE)
          if (wanted === active) return
          if (wanted) {
            if (layer.apply()) active = true
          } else if (layer.withdraw()) {
            active = false
          }
          mobileWrite({ phase: active ? 'installed' : 'withdrawn' })
        }
        const stopWatching = controller.subscribe(sync)
        sync()
        return () => {
          stopWatching()
          // Disposal is the third way out, and it leaves the same breadcrumb as
          // the row switch so a reload and a row-off read the same afterwards.
          if (layer.withdraw()) mobileWrite({ phase: 'withdrawn', final: true })
        }
      }, 'edh: mobile layer')
      return () => {
        layer.withdraw()
      }
    }

    // ---------------------------------------------------------------------
    // QR codes
    //
    // Typing an address on a phone is the real friction in publishing this page,
    // so the Remote page can draw the address as a QR. The encoder below is
    // hand-written against ISO/IEC 18004: byte mode, error correction level M,
    // version chosen from the payload, the eight masks scored by the standard
    // penalty rules. It draws only when it can encode; an address it cannot fit
    // is left as text rather than rendered as a graphic that might not scan.
    // ---------------------------------------------------------------------

    /** Modules of white margin required around the symbol. */
    const REMOTE_QR_QUIET = 4

    /**
     * Level-M block structure, versions 1 to 10.
     *
     * `ec` is error-correction codewords per block; `blocks` lists
     * `[blockCount, dataCodewordsPerBlock]`, shortest block first, which is the
     * order the interleaver needs. Ten versions carry 213 bytes in byte mode —
     * far past any LAN address — and keeping the table short keeps it auditable:
     * each row's data and EC codewords must add up to the symbol's capacity,
     * which the suite checks against the module geometry itself.
     */
    const REMOTE_QR_VERSIONS = [
      { ec: 10, blocks: [[1, 16]] },
      { ec: 16, blocks: [[1, 28]] },
      { ec: 26, blocks: [[1, 44]] },
      { ec: 18, blocks: [[2, 32]] },
      { ec: 24, blocks: [[2, 43]] },
      { ec: 16, blocks: [[4, 27]] },
      { ec: 18, blocks: [[4, 31]] },
      { ec: 22, blocks: [[2, 38], [2, 39]] },
      { ec: 22, blocks: [[3, 36], [2, 37]] },
      { ec: 26, blocks: [[4, 43], [1, 44]] },
    ]

    /** Alignment-pattern centres, indexed by `version - 1`. Version 1 has none. */
    const REMOTE_QR_ALIGNMENT = [
      [],
      [6, 18],
      [6, 22],
      [6, 26],
      [6, 30],
      [6, 34],
      [6, 22, 38],
      [6, 24, 42],
      [6, 26, 46],
      [6, 28, 50],
    ]

    /** GF(256) exponent/log tables for the QR field: 0x11d, generator 2. */
    const QR_FIELD = (() => {
      const exponent = new Uint8Array(512)
      const logarithm = new Uint8Array(256)
      let value = 1
      for (let index = 0; index < 255; index++) {
        exponent[index] = value
        logarithm[value] = index
        value <<= 1
        if ((value & 0x100) !== 0) value ^= 0x11d
      }
      for (let index = 255; index < 512; index++) exponent[index] = exponent[index - 255]
      return { exponent, logarithm }
    })()

    /** One field product. */
    function qrMultiply(left, right) {
      if (left === 0 || right === 0) return 0
      return QR_FIELD.exponent[QR_FIELD.logarithm[left] + QR_FIELD.logarithm[right]]
    }

    /** Generator polynomials, cached: the product of (x - a^i) for i < degree. */
    const QR_GENERATORS = new Map()

    /**
     * The Reed-Solomon generator polynomial of one degree.
     * @param degree - error-correction codewords.
     * @returns its coefficients, highest power first; the leading one is 1.
     */
    function qrGenerator(degree) {
      const cached = QR_GENERATORS.get(degree)
      if (cached !== undefined) return cached
      let polynomial = [1]
      for (let index = 0; index < degree; index++) {
        const next = new Array(polynomial.length + 1).fill(0)
        for (let at = 0; at < polynomial.length; at++) {
          next[at] ^= polynomial[at]
          next[at + 1] ^= qrMultiply(polynomial[at], QR_FIELD.exponent[index])
        }
        polynomial = next
      }
      QR_GENERATORS.set(degree, polynomial)
      return polynomial
    }

    /**
     * The error-correction codewords for one block.
     * @param data - the block's data codewords.
     * @param degree - how many EC codewords to produce.
     */
    function qrRemainder(data, degree) {
      const generator = qrGenerator(degree)
      const result = new Uint8Array(degree)
      for (const byte of data) {
        const factor = byte ^ result[0]
        result.copyWithin(0, 1)
        result[degree - 1] = 0
        for (let at = 0; at < degree; at++) result[at] ^= qrMultiply(generator[at + 1], factor)
      }
      return Array.from(result)
    }

    /** One string as UTF-8 bytes, without depending on `TextEncoder`. */
    function qrBytes(text) {
      const bytes = []
      for (const character of String(text)) {
        const code = character.codePointAt(0)
        if (code < 0x80) bytes.push(code)
        else if (code < 0x800) bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f))
        else if (code < 0x10000) {
          bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f))
        } else {
          bytes.push(
            0xf0 | (code >> 18),
            0x80 | ((code >> 12) & 0x3f),
            0x80 | ((code >> 6) & 0x3f),
            0x80 | (code & 0x3f),
          )
        }
      }
      return bytes
    }

    /** One version's data capacity, in codewords. */
    function qrDataCodewords(version) {
      const spec = REMOTE_QR_VERSIONS[version - 1]
      if (spec === undefined) return 0
      return spec.blocks.reduce((sum, [count, size]) => sum + count * size, 0)
    }

    /** One version's symbol capacity, in codewords. */
    function qrTotalCodewords(version) {
      const spec = REMOTE_QR_VERSIONS[version - 1]
      if (spec === undefined) return 0
      return qrDataCodewords(version) + spec.blocks.reduce((sum, [count]) => sum + count, 0) * spec.ec
    }

    /**
     * The smallest supported version that fits one payload.
     * @param byteLength - payload length in bytes.
     * @returns the version, or 0 when even the largest supported version cannot.
     */
    function qrVersionFor(byteLength) {
      const length = Number(byteLength)
      if (!Number.isFinite(length) || length <= 0) return 0
      for (let version = 1; version <= REMOTE_QR_VERSIONS.length; version++) {
        const headerBits = 4 + (version <= 9 ? 8 : 16)
        if (qrDataCodewords(version) * 8 >= headerBits + length * 8) return version
      }
      return 0
    }

    /** One payload as data codewords, terminated and padded the standard way. */
    function qrPayloadCodewords(bytes, version) {
      const capacity = qrDataCodewords(version)
      const bits = []
      const push = (value, length) => {
        for (let at = length - 1; at >= 0; at--) bits.push((value >> at) & 1)
      }
      push(0b0100, 4)
      push(bytes.length, version <= 9 ? 8 : 16)
      for (const byte of bytes) push(byte, 8)
      const capacityBits = capacity * 8
      for (let at = 0; at < 4 && bits.length < capacityBits; at++) bits.push(0)
      while (bits.length % 8 !== 0) bits.push(0)
      const codewords = []
      for (let at = 0; at < bits.length; at += 8) {
        let byte = 0
        for (let bit = 0; bit < 8; bit++) byte = (byte << 1) | bits[at + bit]
        codewords.push(byte)
      }
      const padding = [0xec, 0x11]
      for (let index = 0; codewords.length < capacity; index++) codewords.push(padding[index % 2])
      return codewords
    }

    /** Data and EC codewords, interleaved the way the symbol stores them. */
    function qrCodewords(bytes, version) {
      const spec = REMOTE_QR_VERSIONS[version - 1]
      const data = qrPayloadCodewords(bytes, version)
      const blocks = []
      let offset = 0
      for (const [count, size] of spec.blocks) {
        for (let index = 0; index < count; index++) {
          const block = data.slice(offset, offset + size)
          offset += size
          blocks.push({ data: block, ec: qrRemainder(block, spec.ec) })
        }
      }
      const interleaved = []
      const longest = Math.max(...blocks.map(block => block.data.length))
      for (let at = 0; at < longest; at++) {
        for (const block of blocks) if (at < block.data.length) interleaved.push(block.data[at])
      }
      for (let at = 0; at < spec.ec; at++) {
        for (const block of blocks) interleaved.push(block.ec[at])
      }
      return interleaved
    }

    /** The eight data masks, as the standard defines them. */
    const QR_MASKS = [
      (row, col) => (row + col) % 2 === 0,
      (row) => row % 2 === 0,
      (row, col) => col % 3 === 0,
      (row, col) => (row + col) % 3 === 0,
      (row, col) => (Math.floor(row / 2) + Math.floor(col / 3)) % 2 === 0,
      (row, col) => ((row * col) % 2) + ((row * col) % 3) === 0,
      (row, col) => (((row * col) % 2) + ((row * col) % 3)) % 2 === 0,
      (row, col) => (((row + col) % 2) + ((row * col) % 3)) % 2 === 0,
    ]

    /**
     * The 15-bit format information for level M and one mask.
     *
     * Five data bits (M is `00`, then the mask) with a BCH(15,5) remainder over
     * 0x537, XORed with the standard mask 0x5412.
     */
    function qrFormatBits(mask) {
      const data = (0b00 << 3) | mask
      let remainder = data << 10
      for (let at = 4; at >= 0; at--) {
        if (((remainder >> (at + 10)) & 1) !== 0) remainder ^= 0x537 << at
      }
      return ((data << 10) | remainder) ^ 0x5412
    }

    /** The 18-bit version information, for versions 7 and up. */
    function qrVersionBits(version) {
      let remainder = version << 12
      for (let at = 5; at >= 0; at--) {
        if (((remainder >> (at + 12)) & 1) !== 0) remainder ^= 0x1f25 << at
      }
      return (version << 12) | remainder
    }

    /** The score the standard uses to choose a mask: lower is better. */
    function qrPenalty(modules) {
      const size = modules.length
      let score = 0
      const runs = values => {
        let run = 1
        for (let at = 1; at < values.length; at++) {
          if (values[at] === values[at - 1]) {
            run++
            if (run === 5) score += 3
            else if (run > 5) score += 1
          } else {
            run = 1
          }
        }
      }
      for (let row = 0; row < size; row++) runs(modules[row])
      for (let col = 0; col < size; col++) runs(modules.map(line => line[col]))
      // Adjacent 2x2 blocks of one colour.
      for (let row = 0; row < size - 1; row++) {
        for (let col = 0; col < size - 1; col++) {
          const value = modules[row][col]
          if (value === modules[row][col + 1]
            && value === modules[row + 1][col]
            && value === modules[row + 1][col + 1]) score += 3
        }
      }
      // Finder-like runs, which confuse a scanner most.
      const patterns = [[1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 0], [0, 0, 0, 0, 1, 0, 1, 1, 1, 0, 1]]
      const matches = values => {
        for (let at = 0; at + 11 <= values.length; at++) {
          for (const pattern of patterns) {
            let hit = true
            for (let bit = 0; bit < 11; bit++) {
              if (values[at + bit] !== pattern[bit]) {
                hit = false
                break
              }
            }
            if (hit) score += 40
          }
        }
      }
      for (let row = 0; row < size; row++) matches(modules[row])
      for (let col = 0; col < size; col++) matches(modules.map(line => line[col]))
      // The dark/light balance.
      let dark = 0
      for (const line of modules) for (const value of line) dark += value
      const ratio = (dark * 100) / (size * size)
      score += Math.floor(Math.abs(ratio - 50) / 5) * 10
      return score
    }

    /**
     * The finished symbol for one piece of text.
     *
     * Function patterns are placed first and recorded as reserved; the data is
     * laid down the standard zigzag beside them; each mask is then applied to the
     * data modules only and scored, and the lowest score wins.
     * @param text - the payload.
     * @returns `{ text, version, size, mask, modules }`, or `undefined` when the
     *   payload does not fit a supported version.
     */
    function remoteQrModel(text) {
      const value = String(text ?? '')
      if (value === '') return undefined
      const bytes = qrBytes(value)
      const version = qrVersionFor(bytes.length)
      if (version === 0) return undefined
      const size = version * 4 + 17
      const modules = Array.from({ length: size }, () => new Uint8Array(size))
      const reserved = Array.from({ length: size }, () => new Uint8Array(size))

      const setFunction = (row, col, dark) => {
        if (row < 0 || col < 0 || row >= size || col >= size) return
        modules[row][col] = dark ? 1 : 0
        reserved[row][col] = 1
      }
      const placeFinder = (top, left) => {
        for (let row = -1; row <= 7; row++) {
          for (let col = -1; col <= 7; col++) {
            const inside = row >= 0 && row <= 6 && col >= 0 && col <= 6
            const dark = inside && (
              row === 0 || row === 6 || col === 0 || col === 6
              || (row >= 2 && row <= 4 && col >= 2 && col <= 4)
            )
            setFunction(top + row, left + col, dark)
          }
        }
      }
      placeFinder(0, 0)
      placeFinder(0, size - 7)
      placeFinder(size - 7, 0)
      // Timing patterns: alternating from the first free module after a finder.
      for (let at = 8; at < size - 8; at++) {
        setFunction(6, at, at % 2 === 0)
        setFunction(at, 6, at % 2 === 0)
      }
      // Alignment patterns, everywhere except the three finder corners.
      const centres = REMOTE_QR_ALIGNMENT[version - 1]
      for (const row of centres) {
        for (const col of centres) {
          const corner = (row <= 8 && col <= 8)
            || (row <= 8 && col >= size - 9)
            || (row >= size - 9 && col <= 8)
          if (corner) continue
          for (let dr = -2; dr <= 2; dr++) {
            for (let dc = -2; dc <= 2; dc++) {
              const dark = Math.max(Math.abs(dr), Math.abs(dc)) !== 1
              setFunction(row + dr, col + dc, dark)
            }
          }
        }
      }
      // The dark module, and the areas the format and version bits live in.
      setFunction(size - 8, 8, true)
      for (let at = 0; at <= 8; at++) {
        if (reserved[8][at] === 0) reserved[8][at] = 1
        if (reserved[at][8] === 0) reserved[at][8] = 1
      }
      for (let at = 0; at < 8; at++) {
        reserved[8][size - 1 - at] = 1
        reserved[size - 1 - at][8] = 1
      }
      if (version >= 7) {
        for (let at = 0; at < 18; at++) {
          reserved[Math.floor(at / 3)][size - 11 + (at % 3)] = 1
          reserved[size - 11 + (at % 3)][Math.floor(at / 3)] = 1
        }
      }

      // The data bits, in the standard two-column zigzag, skipping function modules.
      const codewords = qrCodewords(bytes, version)
      const bits = []
      for (const codeword of codewords) for (let at = 7; at >= 0; at--) bits.push((codeword >> at) & 1)
      let cursor = 0
      let upward = true
      for (let right = size - 1; right > 0; right -= 2) {
        if (right === 6) right = 5
        for (let step = 0; step < size; step++) {
          const row = upward ? size - 1 - step : step
          for (let offset = 0; offset < 2; offset++) {
            const col = right - offset
            if (reserved[row][col] === 1) continue
            modules[row][col] = bits[cursor] ?? 0
            cursor++
          }
        }
        upward = !upward
      }

      const placeFormat = (matrix, mask) => {
        const bits15 = qrFormatBits(mask)
        // Position 0 carries the most significant bit: the 15-bit format string
        // is laid down MSB-first, in both of its copies.
        const bit = index => (bits15 >> (14 - index)) & 1
        for (let at = 0; at <= 5; at++) matrix[8][at] = bit(at)
        matrix[8][7] = bit(6)
        matrix[8][8] = bit(7)
        matrix[7][8] = bit(8)
        for (let at = 9; at <= 14; at++) matrix[14 - at][8] = bit(at)
        for (let at = 0; at <= 6; at++) matrix[size - 1 - at][8] = bit(at)
        for (let at = 7; at <= 14; at++) matrix[8][size - 15 + at] = bit(at)
      }

      let best
      for (let mask = 0; mask < QR_MASKS.length; mask++) {
        const candidate = modules.map(line => Array.from(line))
        const applies = QR_MASKS[mask]
        for (let row = 0; row < size; row++) {
          for (let col = 0; col < size; col++) {
            if (reserved[row][col] === 1) continue
            if (applies(row, col)) candidate[row][col] ^= 1
          }
        }
        placeFormat(candidate, mask)
        if (version >= 7) {
          const bits18 = qrVersionBits(version)
          for (let at = 0; at < 18; at++) {
            const dark = (bits18 >> at) & 1
            candidate[Math.floor(at / 3)][size - 11 + (at % 3)] = dark
            candidate[size - 11 + (at % 3)][Math.floor(at / 3)] = dark
          }
        }
        const score = qrPenalty(candidate)
        if (best === undefined || score < best.score) best = { mask, score, modules: candidate }
      }

      return { text: value, version, size, mask: best.mask, modules: best.modules }
    }

    /**
     * One QR as inline SVG.
     *
     * The quiet zone is part of the drawing — a symbol cropped to its edge is a
     * symbol a camera struggles to find — and both colours are fixed black on
     * white, because a theme-coloured code is a code that can fail to scan.
     * @param model - a `remoteQrModel` result.
     * @param label - the accessible name.
     */
    function remoteQrSvg(model, label) {
      if (model === undefined || model === null) return null
      const quiet = REMOTE_QR_QUIET
      const span = model.size + quiet * 2
      const commands = []
      for (let row = 0; row < model.size; row++) {
        for (let col = 0; col < model.size; col++) {
          if (model.modules[row][col] === 1) commands.push(`M${col + quiet} ${row + quiet}h1v1h-1z`)
        }
      }
      return h('svg', {
        className: 'edh-remote-qr',
        viewBox: `0 0 ${span} ${span}`,
        role: 'img',
        'aria-label': label,
        shapeRendering: 'crispEdges',
        focusable: 'false',
      },
        h('rect', { x: 0, y: 0, width: span, height: span, fill: '#ffffff' }),
        h('path', { d: commands.join(''), fill: '#000000' }),
      )
    }

    /**
     * One request on the usage route.
     *
     * A rejected action answers a non-200 status with the same JSON body, so the
     * body decides; only a reply without one is a route failure, and it carries
     * the status because a missing route means the feature is not on this profile.
     */
    async function requestUsage(method, body) {
      const response = await fetch(USAGE_ROUTE, {
        method,
        headers: body === undefined
          ? { accept: 'application/json' }
          : { accept: 'application/json', 'content-type': 'application/json' },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      })
      if (response === null || response === undefined) throw new Error(`${USAGE_ROUTE} answered nothing`)
      let answer
      try {
        answer = await response.json()
      } catch (error) {
        answer = undefined
      }
      if (answer !== null && typeof answer === 'object') return answer
      const failure = new Error(`${USAGE_ROUTE} answered ${response.status}`)
      failure.status = response.status
      throw failure
    }

    // ---------------------------------------------------------------------
    // Notifications
    //
    // A sound when a turn finishes while you are looking somewhere else. The
    // sound is the channel that always works — Web Audio needs no secure
    // context — and the browser popup is a bonus that is feature-detected and
    // never promised: Remote serves this page over plain HTTP on the LAN, where
    // the Notification API does not exist at all.
    //
    // The engine is one Remote listener. The harness's own session controller
    // feeds 'api-session/status' with (sessionId, running), so a session that
    // goes running and then idle is one finished turn — the moment worth a sound.
    // ---------------------------------------------------------------------

    /** The row that governs the whole feature. */
    const NOTIFY_MODULE = '@moreweb/edh/notify'

    /** The Settings seat: one page in the Settings navigation. */
    const NOTIFY_SECTION_SLOT = 'settings.section'

    /** MCP 16, Remote 17, Usage 18 — this is the fourth seat. */
    const NOTIFY_SECTION_ORDER = 19

    /** Where the settings live. Local Storage, so a change needs no round-trip. */
    const NOTIFY_SETTINGS_KEY = 'edh:notify'

    /**
     * The breadcrumb key, deliberately beside the settings key rather than on it:
     * the brief names both 'edh:notify', but one is durable user data and the
     * other is the last diagnostic event, and a write of one would erase the other.
     */
    const NOTIFY_DEBUG_KEY = 'edh:notify:debug'

    /** The Host route for the curated Windows sounds. */
    const NOTIFY_SOUNDS_ROUTE = 'api/edh.notify/sounds'

    /** The Host route for one sound's bytes. */
    const NOTIFY_SOUND_ROUTE = 'api/edh.notify/sound'

    /** The three tones this page synthesises, in the order they are offered. */
    const NOTIFY_TONES = [
      {
        id: 'chime',
        labelKey: 'notifyToneChime',
        hintKey: 'notifyToneChimeHint',
        // A soft bell: a fundamental and a quiet octave, both decaying away.
        voices: [
          { start: 0, frequency: 880, duration: 1.2, gain: 0.22 },
          { start: 0, frequency: 1760, duration: 0.8, gain: 0.07 },
        ],
      },
      {
        id: 'two-tone',
        labelKey: 'notifyToneTwo',
        hintKey: 'notifyToneTwoHint',
        // Rising, unhurried: a question answered, not an alarm raised.
        voices: [
          { start: 0, frequency: 660, duration: 0.22, gain: 0.2 },
          { start: 0.26, frequency: 880, duration: 0.34, gain: 0.2 },
        ],
      },
      {
        id: 'blip',
        labelKey: 'notifyToneBlip',
        hintKey: 'notifyToneBlipHint',
        // One short high note: the smallest acknowledgement that reads clearly.
        voices: [
          { start: 0, frequency: 1240, duration: 0.09, gain: 0.18 },
        ],
      },
    ]

    /** The longest notification title worth showing on a lock screen. */
    const NOTIFY_TITLE_MAX = 48

    /** The longest body line worth showing. */
    const NOTIFY_BODY_MAX = 120

    /** How long a text read may take before the popup goes ahead without it. */
    const NOTIFY_TEXT_TIMEOUT_MS = 1200

    /**
     * One line: whitespace collapsed, then trimmed on a word boundary.
     *
     * Counted in code points, not UTF-16 units, so a title in Chinese or an emoji
     * is trimmed where the reader sees characters rather than where JS splits a
     * surrogate pair.
     * @param text - anything that should become one line.
     * @param limit - the longest line to keep.
     */
    function notifyClampText(text, limit) {
      const collapsed = String(text ?? '').replace(/\s+/gu, ' ').trim()
      const characters = [...collapsed]
      if (characters.length === 0) return ''
      if (characters.length <= limit) return collapsed
      const head = characters.slice(0, limit)
      const space = head.lastIndexOf(' ')
      const cut = space > Math.floor(limit / 2) ? head.slice(0, space) : head
      const trimmed = cut.join('').replace(/[\s,;:.!?…-]+$/u, '')
      return `${trimmed === '' ? head.join('') : trimmed}…`
    }

    /**
     * The popup's title: the session's own title, or one honest sentence.
     * @param title - the session title from the list projection, may be empty.
     * @param t - the dictionary's translate function.
     */
    function notifyTitleText(title, t) {
      const trimmed = notifyClampText(title, NOTIFY_TITLE_MAX)
      if (trimmed !== '') return trimmed
      // A notifier built without a dictionary (the suite, or a headless use)
      // still gets one plain sentence rather than a thrown error.
      return typeof t === 'function' ? t('notifyTitleFallback') : 'Session finished'
    }

    /**
     * The popup's body: the first line of the turn's last assistant message, or
     * a plain sentence when the turn produced no text at all. Never empty, and
     * never a tool name dressed up as content.
     * @param text - the assistant text, may be empty.
     * @param t - the dictionary's translate function.
     */
    function notifyBodyText(text, t) {
      const trimmed = notifyClampText(text, NOTIFY_BODY_MAX)
      if (trimmed !== '') return trimmed
      return typeof t === 'function' ? t('notifyBodyFallback') : 'The turn finished. Open it to read the result.'
    }

    /** The Host route that reads the newest assistant line of one session. */
    const NOTIFY_LAST_ROUTE = 'api/edh.notify/last'

    /**
     * Read the last assistant text for one finished session from the Host.
     *
     * This is the only round-trip in the notification path, so it is bounded on
     * both sides: an abort signal at the same cap the caller races, and every
     * failure — a refusal, a rejected fetch, a body that is not JSON — ends as an
     * empty answer rather than an error. A generic body is better than a
     * notification that never appears, and the sound has already played.
     * @param sessionId - the session that just finished.
     * @param options - fetch, the cap, and a log.
     * @returns `{ text, title }`, both possibly empty.
     */
    async function readNotifyLast(sessionId, options = {}) {
      const id = typeof sessionId === 'string' ? sessionId.trim() : ''
      if (id === '') return { text: '', title: '' }
      const request = options.fetch ?? (typeof fetch === 'function' ? fetch : undefined)
      if (typeof request !== 'function') return { text: '', title: '' }
      const cap = Number(options.timeoutMs)
      const timeoutMs = Number.isFinite(cap) && cap > 0 ? cap : NOTIFY_TEXT_TIMEOUT_MS
      const signal = typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function'
        ? AbortSignal.timeout(timeoutMs)
        : undefined
      try {
        const response = await request(`${NOTIFY_LAST_ROUTE}?sessionId=${encodeURIComponent(id)}`, {
          headers: { accept: 'application/json' },
          ...(signal === undefined ? {} : { signal }),
        })
        if (response === null || typeof response !== 'object' || response.ok !== true) {
          options.log?.({ phase: 'failed', action: 'last', reason: String(response?.status ?? 'no-response') })
          return { text: '', title: '' }
        }
        const answer = await response.json()
        if (answer === null || typeof answer !== 'object' || answer.ok !== true) {
          options.log?.({ phase: 'failed', action: 'last', reason: String(answer?.reason ?? 'refused') })
          return { text: '', title: '' }
        }
        return {
          text: typeof answer.text === 'string' ? answer.text : '',
          title: typeof answer.title === 'string' ? answer.title.trim() : '',
        }
      } catch (error) {
        options.log?.({ phase: 'failed', action: 'last', reason: messageOf(error) })
        return { text: '', title: '' }
      }
    }

    /**
     * Resolve the body against a reader that may be slow or may fail.
     *
     * The read is capped: a notification that arrives late is worse than one that
     * arrives promptly with a plain sentence, and the sound has already played by
     * the time this runs. A rejected read, a hung read and an absent reader all
     * end in the same honest sentence.
     * @param options - the reader, the cap, and the dictionary.
     */
    async function runNotifyText(options = {}) {
      const t = typeof options.t === 'function' ? options.t : key => key
      const fallback = { body: notifyBodyText('', t), title: '' }
      const read = options.read
      if (typeof read !== 'function') return fallback
      const cap = Number(options.timeoutMs)
      const timeoutMs = Number.isFinite(cap) && cap > 0 ? cap : NOTIFY_TEXT_TIMEOUT_MS
      let timer
      try {
        const answer = await Promise.race([
          Promise.resolve().then(() => read()),
          new Promise(resolve => {
            timer = setTimeout(() => resolve(''), timeoutMs)
          }),
        ])
        // A reader may answer a string, or `{ text, title }` from the Host route.
        const text = typeof answer === 'string'
          ? answer
          : answer !== null && typeof answer === 'object' ? answer.text : ''
        const title = answer !== null && typeof answer === 'object' && typeof answer.title === 'string'
          ? answer.title.trim()
          : ''
        return { body: notifyBodyText(typeof text === 'string' ? text : '', t), title }
      } catch (error) {
        return fallback
      } finally {
        if (timer !== undefined) clearTimeout(timer)
      }
    }

    /** The Session's title from the list projection the sidebar itself shows. */
    function notifySessionTitle(sessions, sessionId) {
      const id = typeof sessionId === 'string' ? sessionId : ''
      if (id === '') return ''
      try {
        const row = sessions?.list?.getSnapshot?.()?.byId?.[id]
        if (row !== undefined && typeof row.title === 'string') return row.title.trim()
      } catch (error) {
        // The projection is diagnostic here; an unreadable list means no title.
      }
      return ''
    }

    /** The Host route that restores and raises the Harness's own window. */
    const NOTIFY_RAISE_ROUTE = 'api/edh.notify/raise'

    /** How long the raise may take before it is abandoned. */
    const NOTIFY_RAISE_TIMEOUT_MS = 1500

    /**
     * Ask the Host to bring the application window forward.
     *
     * A renderer cannot raise its own OS window — `window.focus()` is a hint the
     * platform may ignore, and a minimised window cannot come forward at all — so
     * this is the Host's job, by process id. Every outcome is reported rather
     * than swallowed: a refusal is `blocked { reason:'raise-denied' }`, anything
     * that broke is `failed { action:'raise', reason }`, so a live report of "it
     * still did not come forward" is diagnosable from the breadcrumb alone.
     *
     * The caller starts this and does not await it: the conversation is the
     * point, and a slow native call must never delay the session switch.
     * @param options - the fetch, the cap, and a log.
     * @returns `{ raised, reason? }`; never throws.
     */
    async function raiseNotifyWindow(options = {}) {
      const log = typeof options.log === 'function' ? options.log : () => {}
      const request = options.fetch ?? (typeof fetch === 'function' ? fetch : undefined)
      if (typeof request !== 'function') {
        log({ phase: 'blocked', reason: 'raise-unavailable' })
        return { raised: false, reason: 'raise-unavailable' }
      }
      const cap = Number(options.timeoutMs)
      const timeoutMs = Number.isFinite(cap) && cap > 0 ? cap : NOTIFY_RAISE_TIMEOUT_MS
      const signal = typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function'
        ? AbortSignal.timeout(timeoutMs)
        : undefined
      let timer
      try {
        const attempt = (async () => {
          const response = await request(NOTIFY_RAISE_ROUTE, {
            method: 'POST',
            headers: { accept: 'application/json' },
            ...(signal === undefined ? {} : { signal }),
          })
          if (response === null || typeof response !== 'object' || response.ok !== true) {
            log({ phase: 'failed', action: 'raise', reason: String(response?.status ?? 'no-response') })
            return { raised: false, reason: 'http' }
          }
          const answer = await response.json()
          if (answer === null || typeof answer !== 'object' || answer.ok !== true) {
            log({ phase: 'failed', action: 'raise', reason: String(answer?.reason ?? 'refused') })
            return { raised: false, reason: 'refused' }
          }
          if (answer.raised !== true) {
            log({ phase: 'blocked', reason: 'raise-denied' })
            return { raised: false, reason: 'raise-denied' }
          }
          log({ phase: 'raised', window: true })
          return { raised: true }
        })()
        // The cap is enforced here as well as by the abort signal: a build with
        // no `AbortSignal.timeout`, or a call that ignores its signal, must still
        // end, and must still say so.
        const answer = await Promise.race([
          attempt,
          new Promise(resolve => {
            timer = setTimeout(() => {
              log({ phase: 'failed', action: 'raise', reason: 'timeout' })
              resolve({ raised: false, reason: 'timeout' })
            }, timeoutMs)
          }),
        ])
        return answer
      } catch (error) {
        log({ phase: 'failed', action: 'raise', reason: messageOf(error) })
        return { raised: false, reason: 'threw' }
      } finally {
        if (timer !== undefined) clearTimeout(timer)
      }
    }

    /**
     * What one click on the popup does: focus the window, open that conversation.
     *
     * Every step is guarded, because this runs from a click inside a native
     * notification where a throw has nowhere to go. A missing id navigates
     * nowhere and says why; an absent or refusing workspace records a failure and
     * stays put — it never falls back to some other conversation.
     * @param options - the session id, the opener, the focus attempt, and a log.
     * @returns what happened.
     */
    function notifyOpenSession(options = {}) {
      const log = typeof options.log === 'function' ? options.log : () => {}
      const sessionId = typeof options.sessionId === 'string' ? options.sessionId.trim() : ''
      if (sessionId === '') {
        log({ phase: 'blocked', reason: 'no-session' })
        return { opened: false, reason: 'no-session' }
      }
      let focused = false
      try {
        if (typeof options.focus === 'function') {
          options.focus()
          focused = true
        }
      } catch (error) {
        // A browser that refuses to focus a window is not an error.
      }
      // Start the raise and do not wait for it. A minimised window needs the Host
      // to restore it by process id, and that native call can take seconds —
      // while the conversation can switch right now.
      let raising = false
      try {
        if (typeof options.raise === 'function') {
          raising = true
          const pending = options.raise(sessionId)
          if (pending !== null && typeof pending === 'object' && typeof pending.then === 'function') {
            pending.then(
              answer => {
                if (answer !== null && typeof answer === 'object' && answer.raised !== true) {
                  log({ phase: 'failed', action: 'raise', reason: String(answer.reason ?? 'denied') })
                }
              },
              error => log({ phase: 'failed', action: 'raise', reason: messageOf(error) }),
            )
          }
        }
      } catch (error) {
        raising = false
        log({ phase: 'failed', action: 'raise', reason: messageOf(error) })
      }
      if (typeof options.open !== 'function') {
        log({ phase: 'failed', action: 'open', reason: 'no-workspace', turn: sessionId })
        return { opened: false, reason: 'no-workspace', focused }
      }
      try {
        const answer = options.open(sessionId)
        if (answer !== null && typeof answer === 'object' && typeof answer.catch === 'function') {
          answer.catch(error => log({ phase: 'failed', action: 'open', reason: messageOf(error), turn: sessionId }))
        }
        log({ phase: 'opened', turn: sessionId, focused, raising })
        return { opened: true, sessionId, focused, raising }
      } catch (error) {
        log({ phase: 'failed', action: 'open', reason: messageOf(error), turn: sessionId })
        return { opened: false, reason: 'threw', focused }
      }
    }

    /** The defaults, and the only values a junk store can fall back to. */
    function notifyDefaults() {
      return { enabled: true, backgroundOnly: true, sound: 'chime', volume: 60 }
    }

    /** One volume, clamped to whole 0..100. */
    function notifyClampVolume(value) {
      const number = Number(value)
      if (!Number.isFinite(number)) return 60
      return Math.min(100, Math.max(0, Math.round(number)))
    }

    /** Whether one id names a tone this page synthesises. */
    function notifyIsTone(id) {
      return NOTIFY_TONES.some(tone => tone.id === id)
    }

    /** A DOM-safe id fragment: catalogue keys may carry spaces and dots. */
    function notifyDomId(id) {
      return String(id ?? '').toLowerCase().replace(/[^a-z0-9_-]+/gu, '-').replace(/^-+|-+$/gu, '')
    }

    /**
     * The settings as stored, validated field by field.
     *
     * A setting read from Local Storage is user data that may have been written by
     * an older build, so every field is checked against what this page can honour
     * and falls back to its default rather than to something half-valid. A sound
     * id is not validated against the catalogue here: that list belongs to the
     * Host and may be unavailable, so a stale id is resolved at play time.
     * @param storage - a localStorage-shaped object; optional.
     */
    function readNotifySettings(storage = (typeof window === 'undefined' ? undefined : window.localStorage)) {
      const defaults = notifyDefaults()
      if (storage === undefined || storage === null || typeof storage.getItem !== 'function') return defaults
      let raw
      try {
        raw = storage.getItem(NOTIFY_SETTINGS_KEY)
      } catch (error) {
        return defaults
      }
      if (typeof raw !== 'string' || raw === '') return defaults
      let parsed
      try {
        parsed = JSON.parse(raw)
      } catch (error) {
        return defaults
      }
      if (parsed === null || typeof parsed !== 'object') return defaults
      return {
        enabled: typeof parsed.enabled === 'boolean' ? parsed.enabled : defaults.enabled,
        backgroundOnly: typeof parsed.backgroundOnly === 'boolean' ? parsed.backgroundOnly : defaults.backgroundOnly,
        sound: typeof parsed.sound === 'string' && parsed.sound.trim() !== '' ? parsed.sound.trim() : defaults.sound,
        volume: notifyClampVolume(parsed.volume ?? defaults.volume),
      }
    }

    /**
     * Write one settings object back.
     * @returns whether the write landed; a refused store is not an error.
     */
    function writeNotifySettings(settings, storage = (typeof window === 'undefined' ? undefined : window.localStorage)) {
      if (storage === undefined || storage === null || typeof storage.setItem !== 'function') return false
      try {
        storage.setItem(NOTIFY_SETTINGS_KEY, JSON.stringify(settings))
        return true
      } catch (error) {
        return false
      }
    }

    /**
     * The Host's sound list, read without trusting its shape.
     *
     * The page always has its own three tones; this only adds the machine's
     * Windows sounds, and only when the Host says the folder was found.
     * @param payload - a GET api/edh.notify/sounds answer.
     */
    function notifyCatalog(payload) {
      const answer = payload !== null && typeof payload === 'object' ? payload : {}
      const windows = []
      for (const entry of Array.isArray(answer.sounds) ? answer.sounds : []) {
        if (entry === null || typeof entry !== 'object') continue
        const id = typeof entry.id === 'string' ? entry.id.trim() : ''
        if (id === '' || notifyIsTone(id)) continue
        const label = typeof entry.label === 'string' && entry.label.trim() !== '' ? entry.label.trim() : id
        windows.push({
          id,
          label,
          kind: 'system',
          bytes: Number.isFinite(Number(entry.bytes)) && Number(entry.bytes) > 0 ? Math.trunc(Number(entry.bytes)) : 0,
        })
      }
      return {
        available: answer.available === true && windows.length > 0,
        windows,
        note: typeof answer.note === 'string' ? answer.note.trim() : '',
      }
    }

    /**
     * The transition detector: one finished turn, once.
     *
     * The harness reports a state, not a turn id, so the state per session is what
     * is tracked: a true arms the session, and the first false after it fires. A
     * second false with no true between is the same finished turn reported again
     * and stays silent; a new true arms it for the next turn.
     * @param previous - { running, fired }, both session-id keyed.
     * @param sessionId - the session the event is about.
     * @param running - whether its agent is running now.
     * @returns whether to fire, and the state to keep.
     */
    function notifyTransition(previous, sessionId, running) {
      const state = previous !== null && typeof previous === 'object' ? previous : {}
      const runningBefore = state.running !== null && typeof state.running === 'object' ? { ...state.running } : {}
      const firedBefore = state.fired !== null && typeof state.fired === 'object' ? { ...state.fired } : {}
      const id = String(sessionId ?? '')
      let fire = false
      if (running === true) {
        runningBefore[id] = true
        firedBefore[id] = false
      } else if (runningBefore[id] === true && firedBefore[id] !== true) {
        runningBefore[id] = false
        firedBefore[id] = true
        fire = true
      } else {
        runningBefore[id] = false
      }
      return { fire, state: { running: runningBefore, fired: firedBefore } }
    }

    /** Whether the switches allow a notification at all, right now. */
    function notifyAllows(settings, hidden) {
      const values = settings !== null && typeof settings === 'object' ? settings : notifyDefaults()
      if (values.enabled !== true) return false
      if (values.backgroundOnly === true && hidden !== true) return false
      return true
    }

    /**
     * The sound one settings object names.
     *
     * **Never a substitution.** The id that plays is the id that was stored; the
     * kind is derived from the id itself, not from the Host's catalogue. The
     * catalogue says which rows to *offer*, and gating playback on it meant a
     * page that had never been opened — and so never loaded the list — turned a
     * chosen Windows sound into the default tone. An id the Host no longer has
     * fails at the fetch and stays quiet; it is never rewritten into another
     * sound.
     * @param settings - the current settings.
     */
    function notifySoundFor(settings) {
      const values = settings !== null && typeof settings === 'object' ? settings : notifyDefaults()
      const chosen = typeof values.sound === 'string' && values.sound.trim() !== ''
        ? values.sound.trim()
        : notifyDefaults().sound
      return { id: chosen, kind: notifyIsTone(chosen) ? 'tone' : 'system' }
    }

    /**
     * One AudioContext, created on the first gesture and reused forever.
     *
     * Browsers refuse to start audio without a gesture, so nothing is created at
     * load: the first Play or Test makes it, and every later call reuses it,
     * resuming it when the browser suspended it behind our back.
     * @param options - AudioContext (injected for the suite), and a log.
     */
    function createNotifyAudio(options = {}) {
      const Constructor = options.AudioContext ?? (typeof window === 'undefined' ? undefined : window.AudioContext)
      let context
      const api = {
        /** Whether a context exists yet. */
        created: () => context !== undefined,
        /**
         * The context, created or resumed as needed.
         * @returns it, or undefined when this build has no Web Audio.
         */
        ensure() {
          if (Constructor === undefined) return undefined
          try {
            if (context === undefined) context = new Constructor()
            if (context.state === 'suspended' && typeof context.resume === 'function') {
              const resumed = context.resume()
              if (resumed !== null && typeof resumed === 'object' && typeof resumed.catch === 'function') {
                resumed.catch(() => undefined)
              }
            }
            return context
          } catch (error) {
            options.log?.({ phase: 'failed', action: 'audio', reason: messageOf(error) })
            return undefined
          }
        },
        /** The live state, for the suite and the breadcrumb. */
        state: () => (context === undefined ? '' : String(context.state ?? '')),
        /** Play one tone at one volume, straight from the oscillator table. */
        playTone(tone, volume) {
          const live = api.ensure()
          if (live === undefined || tone === undefined) return false
          try {
            const now = Number(live.currentTime) || 0
            const master = live.createGain()
            master.gain.setValueAtTime(notifyClampVolume(volume) / 100, now)
            master.connect(live.destination)
            for (const voice of tone.voices) {
              const oscillator = live.createOscillator()
              const envelope = live.createGain()
              const at = now + voice.start
              oscillator.type = 'sine'
              oscillator.frequency.setValueAtTime(voice.frequency, at)
              // Short attack, exponential decay, and a conservative peak: the
              // loudest voice here is 0.22, so nothing can clip the mix.
              envelope.gain.setValueAtTime(0.0001, at)
              envelope.gain.linearRampToValueAtTime(voice.gain, at + 0.006)
              envelope.gain.exponentialRampToValueAtTime(0.0001, at + voice.duration)
              oscillator.connect(envelope)
              envelope.connect(master)
              oscillator.start(at)
              oscillator.stop(at + voice.duration + 0.02)
            }
            return true
          } catch (error) {
            options.log?.({ phase: 'failed', action: 'tone', reason: messageOf(error) })
            return false
          }
        },
        /**
         * Play one Host sound.
         * @param id - a catalogue id, encoded into the route.
         * @returns whether playback started.
         */
        async playSound(id) {
          const live = api.ensure()
          if (live === undefined) return false
          try {
            const response = await fetch(`${NOTIFY_SOUND_ROUTE}?id=${encodeURIComponent(id)}`, {
              headers: { accept: 'audio/wav' },
            })
            if (response === null || response.ok !== true) {
              options.log?.({ phase: 'failed', action: 'sound', reason: String(response?.status ?? 'no-response') })
              return false
            }
            const bytes = await response.arrayBuffer()
            const buffer = await new Promise((resolve, reject) => {
              const decoded = live.decodeAudioData(bytes, resolve, reject)
              if (decoded !== null && typeof decoded === 'object' && typeof decoded.then === 'function') {
                decoded.then(resolve, reject)
              }
            })
            const source = live.createBufferSource()
            source.buffer = buffer
            source.connect(live.destination)
            source.start()
            return true
          } catch (error) {
            options.log?.({ phase: 'failed', action: 'sound', reason: messageOf(error) })
            return false
          }
        },
        /** Close the context, so disposal leaves no live audio graph behind. */
        close() {
          if (context === undefined) return
          try {
            const closing = context.close()
            if (closing !== null && typeof closing === 'object' && typeof closing.catch === 'function') {
              closing.catch(() => undefined)
            }
          } catch (error) {
            // A context that refused to close is already gone.
          }
          context = undefined
        },
      }
      return api
    }

    /**
     * The browser popup, feature-detected rather than assumed.
     *
     * The Notification API only exists in a secure context, which a plain-HTTP
     * LAN page is not — so every function here answers no politely instead of
     * raising, and the page says so in one line.
     * @param scope - a window-shaped object.
     */
    function createNotifyPopup(scope = (typeof window === 'undefined' ? undefined : window)) {
      const api = scope !== undefined && scope !== null && typeof scope.Notification === 'function'
        ? scope.Notification
        : undefined
      /** The one popup currently on screen, so a second replaces it. */
      let current
      const popup = {
        /** Whether this build has the API at all. */
        available: api !== undefined,
        /** The current permission, or an empty string when there is no API. */
        permission() {
          if (api === undefined) return ''
          try {
            return String(api.permission ?? '')
          } catch (error) {
            return ''
          }
        },
        /**
         * Ask once, from a real gesture. Never called at load.
         * @returns the permission afterwards.
         */
        async request() {
          if (api === undefined || typeof api.requestPermission !== 'function') return ''
          try {
            return String(await api.requestPermission())
          } catch (error) {
            return ''
          }
        },
        /**
         * Show one popup, but only when it is already permitted.
         *
         * `silent: true` is the whole point: without it the operating system
         * plays its own notification sound on top of the one this page already
         * played, so one finished turn was heard as two. The popup is a visual;
         * the sound is ours, because it is the one the reader chose.
         *
         * One popup is live at a time: a second replaces the first, and the first
         * click detaches both handlers before it acts, so a double click cannot
         * open two conversations and a closed popup leaves no listener behind.
         * @param options - `{ title, body, onClick, onClose }`.
         * @returns whether one was shown.
         */
        show(options = {}) {
          if (api === undefined || popup.permission() !== 'granted') return false
          const answered = options !== null && typeof options === 'object' ? options : {}
          try {
            if (current !== undefined) {
              try {
                current.close()
              } catch (error) {
                // A popup that is already gone is not an error.
              }
              current = undefined
            }
            let notification
            try {
              // eslint-disable-next-line no-new
              notification = new api(String(answered.title ?? ''), {
                body: String(answered.body ?? ''),
                silent: true,
              })
            } catch (error) {
              return false
            }
            let fired = false
            const close = () => {
              try {
                notification.close()
              } catch (error) {
                // Dismissing an already-dismissed popup is not an error.
              }
            }
            notification.onclick = () => {
              if (fired) return
              fired = true
              try {
                if (typeof answered.onClick === 'function') answered.onClick()
              } catch (error) {
                // A click handler never throws back into the browser event.
              }
              close()
            }
            notification.onclose = () => {
              if (current === notification) current = undefined
              notification.onclick = null
              notification.onclose = null
              try {
                if (typeof answered.onClose === 'function') answered.onClose()
              } catch (error) {
                // Cleanup is best effort.
              }
            }
            current = notification
            return true
          } catch (error) {
            return false
          }
        },
      }
      return popup
    }


    /**
     * The notifier: settings, one sound, one optional popup.
     *
     * It owns no DOM and no React: the page asks it to preview, and the watcher
     * asks it to fire. Everything it touches is injected, so the suite drives it
     * with fakes and the browser gets the real AudioContext.
     *
     * **Storage is the source of truth for what plays.** Every resolve re-reads it
     * and validates it, so a sound saved on the page (or in another tab) is the
     * sound the very next fire plays — there is no snapshot taken at install time
     * for a value that can change afterwards.
     * @param options - audio, popup, settings, store, log.
     */
    function createNotifier(options = {}) {
      const audio = options.audio ?? createNotifyAudio({ AudioContext: options.AudioContext, log: options.log })
      const popup = options.popup ?? createNotifyPopup(options.scope)
      const log = typeof options.log === 'function' ? options.log : () => {}
      const store = options.storage
      let settings = options.settings ?? notifyDefaults()
      let catalog = { available: false, windows: [], note: '' }

      const toneFor = id => NOTIFY_TONES.find(tone => tone.id === id)

      /** The settings right now: storage if there is one, else what was injected. */
      const currentSettings = () => {
        if (store !== undefined && store !== null) settings = readNotifySettings(store)
        return settings
      }

      /**
       * What one fire (or one Test) plays: the stored id, its kind, its volume.
       *
       * Read fresh every time so the page, another tab and the watcher can never
       * disagree, and resolved by the one function `notifySoundFor` — no caller
       * has its own idea of which sound is "the" sound.
       */
      const resolveSound = () => {
        const current = currentSettings()
        const wanted = notifySoundFor(current)
        return { id: wanted.id, kind: wanted.kind, volume: notifyClampVolume(current.volume) }
      }

      const play = async wanted => {
        if (wanted.kind === 'tone') return audio.playTone(toneFor(wanted.id), wanted.volume)
        return audio.playSound(wanted.id)
      }

      return {
        settings: () => ({ ...currentSettings() }),
        setSettings(next) {
          settings = next !== null && typeof next === 'object' ? next : notifyDefaults()
        },
        /** Learn the Host's sound list, so the page can offer its rows. */
        setCatalog(next) {
          catalog = next !== null && typeof next === 'object' ? next : { available: false, windows: [], note: '' }
        },
        catalog: () => catalog,
        /** The sound the next fire would play, resolved the way the engine does. */
        resolveSound,
        popup,
        audio,
        /**
         * Play one sound because the reader asked to hear it.
         * @param id - a tone id or a Host sound id.
         */
        async preview(id) {
          const resolved = resolveSound()
          const chosen = typeof id === 'string' && id.trim() !== '' ? id.trim() : resolved.id
          const wanted = notifySoundFor({ sound: chosen })
          const played = (await play({ ...wanted, volume: resolved.volume })) === true
          log({ phase: 'played', sound: wanted.id, kind: wanted.kind, ok: played })
          return played
        },

        /**
         * Fire the notification for one finished turn.
         *
         * The order is fixed and load-bearing: the sound plays first, then the
         * text is resolved with a cap (a slow read must not delay anything that
         * matters), then one silent popup is shown — and that popup knows which
         * conversation it belongs to, so a click can open it. The caller has
         * already decided the switches allow a notification; a popup that cannot
         * be shown is normal on a phone over plain HTTP, not a failure.
         * @param options - the session id and its title.
         * @returns what actually happened.
         */
        async fire({ sessionId, title }) {
          // 1. The sound, immediately: the stored sound, resolved fresh.
          const wanted = resolveSound()
          const played = (await play(wanted)) === true
          // 2. The text, capped: a late notification is worse than a plain one.
          const read = await runNotifyText({
            read: typeof options.readText === 'function' ? () => options.readText(sessionId) : undefined,
            timeoutMs: options.textTimeoutMs,
            t: options.t,
          })
          // The session list is the first source for the title; the Host's answer
          // is the second, and the plain sentence is only for when both are absent.
          const shownTitle = notifyClampText(title, NOTIFY_TITLE_MAX) !== ''
            ? notifyClampText(title, NOTIFY_TITLE_MAX)
            : notifyTitleText(read.title, options.t)
          // 3. One silent popup that knows where it came from.
          const popped = popup.show({
            title: shownTitle,
            body: read.body,
            onClick: () => {
              notifyOpenSession({
                sessionId,
                open: options.openSession,
                focus: options.focus,
                raise: options.raise,
                log,
              })
            },
          })
          log({
            phase: 'fired',
            turn: String(sessionId ?? ''),
            sound: wanted.id,
            kind: wanted.kind,
            volume: wanted.volume,
            played,
            popup: popped,
          })
          return { played, popup: popped }
        },
        close() {
          audio.close()
        },
      }
    }

    /**
     * The Test button's whole job: exactly one sound, and one popup when allowed.
     *
     * Kept out of the component so the suite can count what it does. The order
     * matters: permission is requested only here, from a gesture; the sound is
     * ours and always plays once; and the popup is constructed silent, so the
     * operating system cannot add a second sound of its own.
     * @param options - the notifier, settings, catalogue, copy, and a permission
     *   requester.
     * @returns what actually happened.
     */
    async function runNotifyTest(options = {}) {
      const notifier = options.notifier
      if (notifier === undefined || notifier === null) return { played: false, popup: false, permission: '' }
      const settings = options.settings ?? notifyDefaults()
      if (
        notifier.popup.available
        && notifier.popup.permission() === 'default'
        && typeof options.requestPermission === 'function'
      ) {
        await options.requestPermission()
      }
      // The same resolver the engine fires with: one source of truth for Test,
      // a save and a fire.
      const wanted = typeof notifier.resolveSound === 'function'
        ? notifier.resolveSound()
        : notifySoundFor(settings)
      const played = await notifier.preview(wanted.id)
      const popped = notifier.popup.show({ title: options.title ?? '', body: options.body ?? '' })
      return { played: played === true, popup: popped === true, permission: notifier.popup.permission() }
    }

    /**
     * Install the watcher and keep it in step with its row.
     *
     * One effect owns everything: the Remote subscription, the notifier, and the
     * AudioContext. A row that is off subscribes to nothing, and disposal closes
     * the context and drops the listener, so turning the feature off leaves no
     * live audio graph and no callback behind.
     * @param ctx - the browser plugin context.
     * @param controller - the switch controller holding the row states.
     * @param options - injectable scope, store, audio and visibility for the suite.
     */
    function installNotifier(ctx, controller, options = {}) {
      const scope = options.scope ?? (typeof window === 'undefined' ? undefined : window)
      const store = options.storage ?? (scope === undefined ? undefined : scope.localStorage)
      const hidden = options.hidden ?? (() => (typeof document === 'undefined' ? true : document.hidden === true))
      const notifier = createNotifier({
        audio: options.audio,
        popup: options.popup ?? createNotifyPopup(scope),
        settings: readNotifySettings(store),
        // Storage, not the snapshot above: the engine re-reads it on every play,
        // so a sound saved on the page or in another tab is used immediately.
        storage: store,
        log: notifyWrite,
        // The title, the body reader and the click target all come from the
        // caller, so the engine stays pure and the page supplies the session text.
        t: options.t,
        readText: options.readText,
        openSession: options.openSession,
        focus: options.focus,
        raise: options.raise,
      })
      const state = { running: {}, fired: {} }
      let unsubscribe

      ctx.effect(() => {
        let active = false
        const listen = () => {
          if (unsubscribe !== undefined) return
          if (typeof ctx.remote?.$on !== 'function') {
            notifyWrite({ phase: 'register-failed', part: 'watch' })
            return
          }
          unsubscribe = ctx.remote.$on('api-session/status', (sessionId, running) => {
            // The row and the switches decide; the transition detector decides
            // whether this event is the one finished turn.
            if (!rowEnabled(controller.getSnapshot(), NOTIFY_MODULE)) return
            const settings = notifier.settings()
            const outcome = notifyTransition(state, sessionId, running)
            state.running = outcome.state.running
            state.fired = outcome.state.fired
            if (!outcome.fire) return
            if (!notifyAllows(settings, hidden())) {
              notifyWrite({
                phase: 'blocked',
                reason: settings.enabled !== true ? 'disabled' : 'visible',
                turn: String(sessionId ?? ''),
              })
              return
            }
            let title = ''
            try {
              title = typeof options.title === 'function' ? String(options.title(sessionId) ?? '') : ''
            } catch (error) {
              // A title is nice to have; the sound is not.
            }
            void notifier
              .fire({ sessionId, title })
              .catch(error => notifyWrite({ phase: 'failed', action: 'fire', reason: messageOf(error) }))
          })
          notifyWrite({ phase: 'loaded', sound: notifier.settings().sound, enabled: notifier.settings().enabled })
        }
        /** Subscribe or unsubscribe, to match the row right now. */
        const sync = () => {
          const wanted = rowEnabled(controller.getSnapshot(), NOTIFY_MODULE)
          if (wanted === active) return
          if (wanted) {
            listen()
            active = unsubscribe !== undefined
          } else {
            unsubscribe?.()
            unsubscribe = undefined
            active = false
          }
        }
        const stopWatching = controller.subscribe(sync)
        sync()
        return () => {
          stopWatching()
          unsubscribe?.()
          unsubscribe = undefined
          notifier.close()
        }
      }, 'edh: notify watcher')
      return notifier
    }

    /**
     * The page, rendered from one explicit state.
     *
     * Kept apart from the component for the same reason as its neighbours: with no
     * browser in the loop, this is the only way to see what a state paints.
     * @param t - the dictionary's translate function.
     * @param state - settings, catalogue, catalogue status, and the handlers.
     */
    function notifyPage(t, state) {
      const source = state !== null && typeof state === 'object' ? state : {}
      const settings = source.settings !== null && typeof source.settings === 'object'
        ? source.settings
        : notifyDefaults()
      const catalog = source.catalog !== null && typeof source.catalog === 'object'
        ? source.catalog
        : { available: false, windows: [], note: '' }
      const status = typeof source.status === 'string' ? source.status : 'loading'
      const notice = source.notice !== null && typeof source.notice === 'object'
        ? source.notice
        : { text: '', tone: 'bad' }
      const actions = source.actions !== null && typeof source.actions === 'object' ? source.actions : {}
      const busy = typeof source.busy === 'string' ? source.busy : ''
      const call = (name, ...parameters) => {
        const handler = actions[name]
        if (typeof handler === 'function') handler(...parameters)
      }

      const frame = (...children) => h('div', { className: 'edh-notify' },
        h('h2', { className: 'edh-notify-title' }, t('notifyTitle')),
        h('p', { className: 'edh-notify-intro' }, t('notifyIntro')),
        ...children,
      )

      if (source.enabled === false) {
        return frame(h('p', { className: 'edh-notify-status' }, t('notifyOff')))
      }

      const noticeNode = notice.text === ''
        ? []
        : [h('p', {
          className: 'edh-notify-notice',
          'data-tone': notice.tone === 'ok' ? 'ok' : 'bad',
          role: notice.tone === 'ok' ? 'status' : 'alert',
        }, notice.text)]

      /** One switch row: a label, a sentence, and a real button with a role. */
      const switchRow = (key, label, hint, checked, onToggle) => h('div', {
        key,
        className: 'edh-notify-row',
      },
        h('div', { className: 'edh-notify-rowText' },
          h('span', { className: 'edh-notify-rowLabel' }, label),
          h('span', { className: 'edh-notify-fieldHint' }, hint),
        ),
        h('button', {
          type: 'button',
          role: 'switch',
          className: 'edh-notify-switch',
          'aria-checked': checked,
          'aria-label': label,
          onClick: onToggle,
        },
          h('span', { className: 'edh-notify-switchTrack', 'aria-hidden': true },
            h('span', { className: 'edh-notify-switchDot', 'data-on': checked ? 'true' : 'false' }),
          ),
        ),
      )

      const soundRow = (key, inputId, name, hint, checked, onPick) => h('li', {
        key,
        className: 'edh-notify-soundRow',
      },
        h('input', {
          type: 'radio',
          className: 'edh-notify-radio',
          name: 'edh-notify-sound',
          id: inputId,
          value: key,
          checked,
          onChange: onPick,
        }),
        h('label', { className: 'edh-notify-soundLabel', htmlFor: inputId },
          h('span', { className: 'edh-notify-soundName' }, name),
          h('span', { className: 'edh-notify-soundHint' }, hint),
        ),
        h('button', {
          type: 'button',
          className: 'edh-notify-button edh-notify-buttonSm',
          onClick: () => {
            call('preview', key)
          },
        }, t('notifyPlay')),
      )

      const windowsBlock = catalog.available
        ? [
          h('li', { key: 'windows-heading', className: 'edh-notify-groupHeading', role: 'presentation' },
            h('span', null, t('notifyWindows'))),
          ...catalog.windows.map(sound => soundRow(
            sound.id,
            `edh-notify-sound-${notifyDomId(sound.id)}`,
            sound.label,
            t('notifyWindowsSoundHint'),
            settings.sound === sound.id,
            () => {
              call('sound', sound.id)
            },
          )),
        ]
        : [
          h('li', { key: 'windows-missing', className: 'edh-notify-groupMissing', role: 'presentation' },
            h('span', null, status === 'error' ? t('notifyCatalogFailed') : t('notifyWindowsMissing'))),
        ]

      const percent = `${notifyClampVolume(settings.volume)}%`

      return frame(...noticeNode,
        h('div', { className: 'edh-notify-rows' },
          switchRow('enabled', t('notifyEnable'), t('notifyEnableHint'), settings.enabled === true, () => {
            call('toggle', 'enabled', settings.enabled !== true)
          }),
          switchRow('background', t('notifyBackground'), t('notifyBackgroundHint'), settings.backgroundOnly === true, () => {
            call('toggle', 'backgroundOnly', settings.backgroundOnly !== true)
          }),
          h('div', { key: 'sound', className: 'edh-notify-row edh-notify-rowStack' },
            h('div', { className: 'edh-notify-rowText' },
              h('span', { className: 'edh-notify-rowLabel' }, t('notifySound')),
              h('span', { className: 'edh-notify-fieldHint' }, t('notifySoundHint')),
            ),
            h('ul', {
              className: 'edh-notify-sounds',
              role: 'radiogroup',
              'aria-label': t('notifySound'),
            },
              NOTIFY_TONES.map(tone => soundRow(
                tone.id,
                `edh-notify-sound-${notifyDomId(tone.id)}`,
                t(tone.labelKey),
                t(tone.hintKey),
                settings.sound === tone.id,
                () => {
                  call('sound', tone.id)
                },
              )),
              windowsBlock,
            ),
          ),
          h('div', { key: 'volume', className: 'edh-notify-row' },
            h('div', { className: 'edh-notify-rowText' },
              h('label', { className: 'edh-notify-rowLabel', htmlFor: 'edh-notify-volume' }, t('notifyVolume')),
              h('span', { className: 'edh-notify-fieldHint' }, t('notifyVolumeHint')),
            ),
            h('div', { className: 'edh-notify-volume' },
              h('input', {
                type: 'range',
                id: 'edh-notify-volume',
                className: 'edh-notify-range',
                min: 0,
                max: 100,
                step: 5,
                value: notifyClampVolume(settings.volume),
                'aria-valuetext': percent,
                onChange: event => {
                  call('volume', event.target.value)
                },
              }),
              h('span', { className: 'edh-notify-volumeValue' }, percent),
            ),
          ),
          h('div', { key: 'test', className: 'edh-notify-row' },
            h('div', { className: 'edh-notify-rowText' },
              h('span', { className: 'edh-notify-rowLabel' }, t('notifyTest')),
              h('span', { className: 'edh-notify-fieldHint' }, t('notifyTestHint')),
            ),
            h('button', {
              type: 'button',
              className: 'edh-notify-button edh-notify-buttonPrimary',
              disabled: busy !== '',
              'aria-busy': busy !== '' || undefined,
              onClick: () => {
                call('test')
              },
            }, t('notifyTestAction')),
          ),
        ),
        h('p', { className: 'edh-notify-note' }, t('notifyPlainHttp')),
      )
    }

    /** The page component: settings in Local Storage, the catalogue from the Host. */
    function createNotifyPage(t, controller, shared) {
      const useNotifyEnabled = createFeatureHook(controller, NOTIFY_MODULE, rowEnabled)

      return function EdhNotifyPage() {
        const enabled = useNotifyEnabled()
        const [settings, setSettings] = React.useState(() => readNotifySettings())
        const [catalog, setCatalog] = React.useState({ available: false, windows: [], note: '' })
        const [status, setStatus] = React.useState('loading')
        const [notice, setNotice] = React.useState({ text: '', tone: 'bad' })
        const [busy, setBusy] = React.useState('')
        const notifier = React.useRef(undefined)

        // The page's own preview channel. The watcher has its own notifier, so a
        // preview and a background notification never share a queue.
        // The watcher owns the audio context and the settings the engine fires
        // with; the page borrows that notifier so a change made here is the one
        // the next finished turn plays. Without a shared channel (a page opened
        // on its own) it keeps a private one.
        const channel = () => {
          const live = shared ?? notifier.current
          if (live === undefined) {
            notifier.current = createNotifier({ settings, log: notifyWrite })
            notifier.current.setSettings(settings)
            notifier.current.setCatalog(catalog)
            return notifier.current
          }
          live.setSettings(settings)
          live.setCatalog(catalog)
          return live
        }

        // The Host's curated list, once. A failure is not fatal: the tones are
        // local, so the page stays useful and one line says what is missing.
        React.useEffect(() => {
          if (!enabled) return undefined
          let current = true
          void (async () => {
            try {
              const response = await fetch(NOTIFY_SOUNDS_ROUTE, { headers: { accept: 'application/json' } })
              if (response?.ok !== true) throw new Error(`${NOTIFY_SOUNDS_ROUTE} answered ${response?.status ?? 'nothing'}`)
              const answer = await response.json()
              if (!current) return
              const next = notifyCatalog(answer)
              setCatalog(next)
              shared?.setCatalog(next)
              setStatus('ready')
              notifyWrite({ phase: 'loaded', sounds: next.windows.length, available: next.available })
            } catch (error) {
              if (!current) return
              setStatus('error')
              notifyWrite({ phase: 'failed', action: 'catalog', reason: messageOf(error) })
            }
          })()
          return () => {
            current = false
          }
        }, [enabled])

        React.useEffect(() => () => {
          notifier.current?.close()
          notifier.current = undefined
        }, [])

        const save = React.useCallback((patch, field) => {
          setSettings(previous => {
            const next = { ...previous, ...patch }
            writeNotifySettings(next)
            // The watcher fires with these values, so it learns them now rather
            // than at the next page load.
            shared?.setSettings(next)
            notifyWrite({ phase: 'saved', field })
            return next
          })
        }, [])

        const onToggle = React.useCallback((field, value) => {
          save({ [field]: value === true }, field)
        }, [save])

        const onSound = React.useCallback(id => {
          save({ sound: String(id) }, 'sound')
        }, [save])

        const onVolume = React.useCallback(value => {
          save({ volume: notifyClampVolume(value) }, 'volume')
        }, [save])

        const onPreview = React.useCallback(async id => {
          const played = await channel().preview(id)
          setNotice(played ? { text: '', tone: 'bad' } : { text: t('notifyPlayFailed'), tone: 'bad' })
        }, [settings, catalog, t])

        const onTest = React.useCallback(async () => {
          setBusy('test')
          const live = channel()
          const outcome = await runNotifyTest({
            notifier: live,
            settings,
            catalog,
            title: t('notifyPopupTitle'),
            body: t('notifyPopupBody'),
            requestPermission: async () => {
              const granted = await live.popup.request()
              notifyWrite({ phase: 'saved', field: 'permission', permission: granted })
            },
          })
          setBusy('')
          if (!outcome.played) setNotice({ text: t('notifyPlayFailed'), tone: 'bad' })
          else if (outcome.popup) setNotice({ text: t('notifyTestDone'), tone: 'ok' })
          else if (live.popup.available && outcome.permission === 'denied') {
            setNotice({ text: t('notifyPopupDenied'), tone: 'bad' })
          } else setNotice({ text: t('notifyTestSoundOnly'), tone: 'ok' })
        }, [settings, catalog, t])

        return notifyPage(t, {
          enabled,
          settings,
          catalog,
          status,
          notice,
          busy,
          actions: {
            toggle: onToggle,
            sound: onSound,
            volume: onVolume,
            preview: onPreview,
            test: onTest,
          },
        })
      }
    }

    /** The page's stylesheet: hairlines and rows, like its neighbours. */
    const NOTIFY_CSS = [
      '.edh-notify{color:var(--dsw-alias-label-primary);flex-direction:column;gap:12px;max-width:760px;display:flex}',
      '.edh-notify-title{margin:0;font-size:16px;font-weight:500;line-height:24px}',
      '.edh-notify-intro{color:var(--dsw-alias-label-tertiary);margin:0;font-size:14px;line-height:22px}',
      '.edh-notify-status{color:var(--dsw-alias-label-tertiary);margin:0;font-size:13px;line-height:20px}',
      '.edh-notify-notice{color:var(--dsw-alias-label-secondary);margin:0;font-size:12px;line-height:18px}',
      '.edh-notify-notice[data-tone=bad]{color:var(--dsw-alias-state-error-primary)}',
      '.edh-notify-notice[data-tone=ok]{color:var(--dsw-alias-state-success-primary)}',
      '.edh-notify-rows{flex-direction:column;display:flex}',
      '.edh-notify-row{border-bottom:.5px solid var(--dsw-alias-border-l2);justify-content:space-between;align-items:center;gap:16px;padding:10px 0;display:flex}',
      '.edh-notify-row:last-child{border-bottom:none;padding-bottom:0}',
      '.edh-notify-rowStack{flex-direction:column;align-items:stretch;gap:8px}',
      '.edh-notify-rowText{flex-direction:column;gap:2px;min-width:0;display:flex}',
      '.edh-notify-rowLabel{font-size:13px;line-height:20px}',
      '.edh-notify-fieldHint{color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px}',
      '.edh-notify-switch{cursor:pointer;background:0 0;border:none;padding:2px;border-radius:999px;flex:none;align-items:center;display:inline-flex}',
      '.edh-notify-switchTrack{box-sizing:border-box;background:var(--dsw-alias-bg-layer-2);border:1px solid var(--dsw-alias-border-l1);border-radius:999px;width:36px;height:20px;padding:1px;display:inline-flex}',
      '.edh-notify-switchDot{background:var(--dsw-alias-label-secondary);border-radius:50%;width:14px;height:14px;display:inline-block;transition:transform 120ms ease}',
      '.edh-notify-switchDot[data-on=true]{background:var(--dsw-alias-brand-primary);transform:translateX(16px)}',
      '.edh-notify-sounds{flex-direction:column;margin:0;padding:0;list-style:none;display:flex}',
      '.edh-notify-soundRow{border-top:.5px solid var(--dsw-alias-border-l2);align-items:center;gap:8px;padding:6px 0;display:flex}',
      '.edh-notify-radio{margin:0;flex:none}',
      '.edh-notify-soundLabel{flex-direction:column;flex:1;gap:1px;min-width:0;cursor:pointer;display:flex}',
      '.edh-notify-soundName{font-size:13px;line-height:19px}',
      '.edh-notify-soundHint{color:var(--dsw-alias-label-tertiary);font-size:11px;line-height:16px}',
      '.edh-notify-groupHeading{color:var(--dsw-alias-label-secondary);border-top:.5px solid var(--dsw-alias-border-l2);padding:10px 0 2px;font-size:12px;line-height:18px}',
      '.edh-notify-groupMissing{color:var(--dsw-alias-label-tertiary);border-top:.5px solid var(--dsw-alias-border-l2);padding:10px 0 2px;font-size:12px;line-height:18px}',
      '.edh-notify-volume{align-items:center;gap:8px;display:flex}',
      '.edh-notify-range{width:180px;accent-color:var(--dsw-alias-brand-primary)}',
      '.edh-notify-volumeValue{color:var(--dsw-alias-label-secondary);text-align:right;min-width:40px;font-size:12px;line-height:18px;font-variant-numeric:tabular-nums}',
      '.edh-notify-note{color:var(--dsw-alias-label-tertiary);margin:0;font-size:12px;line-height:18px}',
      '.edh-notify-button{box-sizing:border-box;color:var(--dsw-alias-label-secondary);cursor:pointer;background:0 0;border:none;border-radius:var(--dsw-radius-sm);justify-content:center;align-items:center;height:28px;padding:0 10px;font:inherit;font-size:12px;line-height:18px;white-space:nowrap;display:inline-flex}',
      '.edh-notify-buttonSm{height:24px;padding:0 8px}',
      '.edh-notify-button:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover)}',
      '.edh-notify-button:disabled{cursor:not-allowed;opacity:.4}',
      '.edh-notify-buttonPrimary{background:var(--dsw-alias-button-primary-fill);color:var(--dsw-alias-label-primary-foreground)}',
      '.edh-notify-buttonPrimary:hover:not(:disabled){background:var(--dsw-alias-button-primary-hover)}',
      '.edh-notify :is(button,input,a):focus-visible{outline:var(--dsw-focus-ring-width) solid var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary));outline-offset:2px}',
    ].join('')

    /** Install the page's stylesheet once and take it back out on dispose. */
    function installNotifyStyles() {
      if (typeof document === 'undefined') return () => {}
      const selector = 'style[data-edh-css="notify"]'
      if (document.querySelector(selector) === null) {
        const tag = document.createElement('style')
        tag.dataset.edhCss = 'notify'
        tag.dataset.plugin = '@moreweb/edh'
        tag.textContent = NOTIFY_CSS
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

    // -------------------------------------------------------------- search
    const SEARCH_MODULE = '@moreweb/edh/search'
    const SEARCH_OVERLAY_SLOT = 'shell.overlay'
    const SEARCH_BUTTON_SLOT = 'sidebar.footer.action'
    const SEARCH_ROUTE = 'api/edh.search'
    const SEARCH_DEBUG_KEY = 'edh:search'
    const SEARCH_ID = 'edh-search-palette'
    const SEARCH_BUTTON_ID = 'edh-search'
    const SEARCH_DEBOUNCE_MS = 200
    const SEARCH_LIMIT = 50
    const SEARCH_SESSIONS_SHOWN = 4
    const SEARCH_MESSAGES_SHOWN = 6
    const SEARCH_ASK_MAX = 60

    /** Separate breadcrumb for the palette. */
    function searchWrite(payload) {
      writeBreadcrumb(SEARCH_DEBUG_KEY, payload)
    }

    /** Where a case-insensitive match starts, or -1. */
    function searchMatchAt(text, needle) {
      const haystack = String(text ?? '')
      const query = String(needle ?? '').trim()
      if (query === '' || haystack === '') return -1
      return haystack.toLowerCase().indexOf(query.toLowerCase())
    }

    /**
     * Split one line into structural segments, so emphasis is weight and never
     * colour: `[{ text, hit }]`, with the first match marked.
     */
    function searchSegments(text, needle) {
      const line = String(text ?? '').replace(/\s+/gu, ' ').trim()
      const at = searchMatchAt(line, needle)
      const query = String(needle ?? '').trim()
      if (at < 0 || query === '') return line === '' ? [] : [{ text: line, hit: false }]
      const before = line.slice(0, at)
      const hit = line.slice(at, at + query.length)
      const after = line.slice(at + query.length)
      const segments = []
      if (before !== '') segments.push({ text: before, hit: false })
      segments.push({ text: hit, hit: true })
      if (after !== '') segments.push({ text: after, hit: false })
      return segments
    }

    /** One quiet right-hand time: how long ago, in the shortest honest form. */
    function searchRelativeTime(time, now) {
      const at = Number(time)
      const base = Number.isFinite(Number(now)) ? Number(now) : Date.now()
      if (!Number.isFinite(at) || at <= 0) return ''
      const seconds = Math.max(0, Math.round((base - at) / 1000))
      if (seconds < 60) return 'now'
      const minutes = Math.round(seconds / 60)
      if (minutes < 60) return `${minutes}m`
      const hours = Math.round(minutes / 60)
      if (hours < 24) return `${hours}h`
      const days = Math.round(hours / 24)
      if (days < 7) return `${days}d`
      return `${Math.round(days / 7)}w`
    }

    /**
     * Session matches from the list projection: cheap, client-side, no request.
     * @param byId - the session list snapshot's rows, keyed by session id.
     * @param query - what the reader typed.
     * @param limit - how many to keep.
     */
    function searchSessionRows(byId, query, limit = SEARCH_SESSIONS_SHOWN) {
      const rows = byId !== null && typeof byId === 'object' ? Object.values(byId) : []
      const matched = []
      for (const row of rows) {
        if (row === null || typeof row !== 'object') continue
        const id = typeof row.sessionId === 'string' ? row.sessionId : typeof row.id === 'string' ? row.id : ''
        const title = typeof row.title === 'string' ? row.title.trim() : ''
        if (id === '' || title === '' || searchMatchAt(title, query) < 0) continue
        matched.push({ id, title, updatedAt: Number(row.updatedAt) || 0 })
      }
      matched.sort((left, right) => right.updatedAt - left.updatedAt)
      return matched.slice(0, limit)
    }

    /** The message rows from one Host answer, clipped and ready to render. */
    function searchMessageRows(answer, query) {
      const messages = answer !== null && typeof answer === 'object' && Array.isArray(answer.messages)
        ? answer.messages
        : []
      const rows = []
      for (const entry of messages) {
        if (entry === null || typeof entry !== 'object') continue
        const sessionId = typeof entry.sessionId === 'string' ? entry.sessionId : ''
        if (sessionId === '') continue
        const snippet = typeof entry.snippet === 'string' ? entry.snippet : ''
        const matched = typeof entry.matched === 'string' && entry.matched !== '' ? entry.matched : query
        rows.push({
          kind: 'message',
          key: `message:${sessionId}:${String(entry.seq ?? rows.length)}`,
          sessionId,
          seq: Number(entry.seq) || 0,
          title: notifyClampText(entry.sessionTitle, 40),
          role: typeof entry.role === 'string' ? entry.role : '',
          time: Number(entry.time) || 0,
          segments: searchSegments(notifyClampText(snippet, 120), matched),
          hit: matched,
        })
        if (rows.length >= SEARCH_MESSAGES_SHOWN) break
      }
      return rows
    }

    /** The quiet line under the Messages section when the index is still building. */
    function searchIndexedNote(indexed, t) {
      if (indexed === null || typeof indexed !== 'object') return ''
      const ready = Number(indexed.ready)
      const total = Number(indexed.total)
      if (!Number.isFinite(ready) || !Number.isFinite(total) || total <= 0) return ''
      if (ready >= total) return ''
      return t('searchIndexing', { ready, total })
    }

    /**
     * Every row the palette shows, as sections for the eye and one flat list for
     * the arrow keys. Pure: the component only renders and dispatches.
     * @param context - query, session rows, message state, and the dictionary.
     */
    function searchRowsFor(context = {}) {
      const t = typeof context.t === 'function' ? context.t : key => key
      const query = String(context.query ?? '').trim()
      const messages = context.messages ?? {}
      const now = Number(context.now) || Date.now()
      const sections = []
      const rows = []
      const push = (section, row) => {
        section.rows.push(row)
        rows.push(row)
      }

      // Chat first: agentic lookup inside the menu. It never creates a session —
      // it asks the agent which existing conversation the words belong to, and the
      // palette offers those conversations as rows.
      const ask = context.ask ?? { status: 'idle' }
      const chat = { id: 'chat', label: t('searchChatSection'), rows: [], note: '', answer: '', live: false, cancel: false }
      if (ask.status === 'running') {
        chat.note = ask.step === 'reading' ? t('searchAskReading') : t('searchAskSearching')
        chat.live = true
        chat.cancel = true
      } else if (ask.status === 'result') {
        chat.answer = String(ask.answer ?? '')
        for (const candidate of Array.isArray(ask.candidates) ? ask.candidates : []) {
          push(chat, {
            kind: 'candidate',
            key: `candidate:${candidate.sessionId}`,
            label: candidate.title === '' ? candidate.sessionId : candidate.title,
            segments: searchSegments(candidate.title, query),
            meta: candidate.reason,
            payload: { sessionId: candidate.sessionId, title: candidate.title, snippet: candidate.snippet },
          })
        }
        if (chat.rows.length === 0) chat.note = t('searchAskNone')
        push(chat, { kind: 'ask-again', key: 'ask:again', label: t('searchAskAgain'), meta: '', payload: { query } })
        push(chat, { kind: 'messages', key: 'ask:messages', label: t('searchAskMessages'), meta: '', payload: {} })
      } else if (ask.status === 'error') {
        chat.note = searchAskFailure(String(ask.reason ?? ''), ask.message, t)
        push(chat, { kind: 'ask-retry', key: 'ask:retry', label: t('searchChatRetry'), meta: '', payload: { query } })
      } else {
        push(chat, {
          kind: 'chat',
          key: 'chat:ask',
          label: query === '' ? t('searchAskEmpty') : t('searchAskIdle'),
          meta: '',
          payload: { query },
        })
      }
      sections.push(chat)


      // Sessions: title matches, straight off the list projection.
      if (query !== '') {
        const sessions = { id: 'sessions', label: t('searchSessionsSection'), rows: [], note: '' }
        const matched = Array.isArray(context.sessions) ? context.sessions : []
        for (const entry of matched) {
          push(sessions, {
            kind: 'session',
            key: `session:${entry.id}`,
            label: entry.title,
            segments: searchSegments(entry.title, query),
            meta: searchRelativeTime(entry.updatedAt, now),
            payload: { sessionId: entry.id },
          })
        }
        if (matched.length === 0) sessions.note = t('searchNoSessions')
        sections.push(sessions)
      }

      // Messages: the Host's full-text answers, debounced and cancellable.
      if (query !== '') {
        const found = { id: 'messages', label: t('searchMessagesSection'), rows: [], note: '' }
        const status = typeof messages.status === 'string' ? messages.status : 'idle'
        if (status === 'loading') {
          found.note = t('searchSearching')
        } else if (status === 'error') {
          push(found, {
            kind: 'retry',
            key: 'messages:retry',
            label: t('searchRetry'),
            meta: '',
            payload: { query },
          })
        } else if (status === 'ready') {
          for (const row of Array.isArray(messages.rows) ? messages.rows : []) push(found, row)
          if (found.rows.length === 0) found.note = t('searchNoMessages')
        }
        const note = searchIndexedNote(messages.indexed, t)
        if (note !== '') found.note = found.note === '' ? note : `${found.note} ${note}`
        sections.push(found)
      }

      // Actions: real destinations this panel can actually reach.
      const actions = { id: 'actions', label: t('searchActionsSection'), rows: [], note: '' }
      for (const action of searchActionRows(t)) push(actions, action)
      sections.push(actions)

      return { sections, rows }
    }

    /** The quiet action destinations, in a deliberate order. */
    function searchActionRows(t) {
      return [
        { kind: 'action', key: 'action:settings', label: t('searchActionSettings'), meta: '', payload: { action: 'settings' } },
        { kind: 'action', key: 'action:sidebar', label: t('searchActionSidebar'), meta: '', payload: { action: 'sidebar' } },
        { kind: 'action', key: 'action:conversation', label: t('searchActionConversation'), meta: '', payload: { action: 'conversation' } },
      ]
    }

    /**
     * Does this key event ask for the palette?
     *
     * Ctrl+K or Cmd+K, with no Alt, and only when nothing else consumed it. Pure
     * on purpose: the listener lives in `apply`, but the decision does not.
     * @param event - a keydown-shaped object.
     * @returns whether to open or toggle.
     */
    function searchShortcutIntent(event) {
      if (event === null || typeof event !== 'object') return false
      if (String(event.key ?? '').toLowerCase() !== 'k') return false
      if (event.ctrlKey !== true && event.metaKey !== true) return false
      if (event.altKey === true) return false
      if (event.defaultPrevented === true) return false
      return true
    }

    /** The state the palette starts in, on every open: never a stale query. */
    function searchInitialState(open) {
      return {
        open: open === true,
        query: '',
        active: 0,
        messages: { status: 'idle', rows: [], indexed: null, truncated: false },
        ask: { status: 'idle' },
        busy: '',
      }
    }
    // The agentic lookup: no session, no new chat, just an answer in the menu.
    const SEARCH_ASK_ROUTE = 'api/edh.ask'
    const SEARCH_ASK_LIMIT = 6
    /** The Host budgets ~30 s; we give up first so the palette never hangs. */
    const SEARCH_ASK_TIMEOUT_MS = 25_000
    /** After this long the agent must be reading, not still queueing. */
    const SEARCH_ASK_STEP_MS = 4_000

    /**
     * The agent-lookup runner: one explicit submission, cancellable, stale-proof.
     *
     * There is no debounce here on purpose — this is a deliberate action, not
     * per-keystroke typing. Two facts it owns: a second submission cancels the
     * first (its generation no longer matches, so its answer is discarded), and
     * the client gives up before the Host's own budget so the menu never sits
     * there waiting on a turn that will not finish.
     * @param options - fetch, the limit, the caps, and a state listener.
     */
    function createAskRunner(options = {}) {
      const request = options.fetch ?? (typeof fetch === 'function' ? fetch : undefined)
      const limit = Number.isFinite(Number(options.limit)) ? Number(options.limit) : SEARCH_ASK_LIMIT
      const timeoutMs = Number.isFinite(Number(options.timeoutMs)) ? Number(options.timeoutMs) : SEARCH_ASK_TIMEOUT_MS
      const stepMs = Number.isFinite(Number(options.stepMs)) ? Number(options.stepMs) : SEARCH_ASK_STEP_MS
      const onPatch = typeof options.onPatch === 'function' ? options.onPatch : () => {}
      const log = typeof options.log === 'function' ? options.log : () => {}
      let generation = 0
      let timer
      let stepper
      let controller

      const cancel = () => {
        generation++
        if (timer !== undefined) {
          clearTimeout(timer)
          timer = undefined
        }
        if (stepper !== undefined) {
          clearTimeout(stepper)
          stepper = undefined
        }
        if (controller !== undefined) {
          try {
            controller.abort()
          } catch (error) {
            // Nothing in flight to abort.
          }
          controller = undefined
        }
      }

      const settle = (mine, patch) => {
        if (mine !== generation) return
        // A finished lookup owns the block: no later step line may overwrite it.
        if (patch.status === 'result' || patch.status === 'error') {
          if (timer !== undefined) {
            clearTimeout(timer)
            timer = undefined
          }
          if (stepper !== undefined) {
            clearTimeout(stepper)
            stepper = undefined
          }
        }
        onPatch(patch)
      }

      const run = async (text, mine) => {
        if (typeof request !== 'function') {
          settle(mine, { status: 'error', reason: 'no-fetch' })
          return
        }
        const signal = typeof AbortController === 'function' ? new AbortController() : undefined
        controller = signal
        try {
          const response = await request(SEARCH_ASK_ROUTE, {
            method: 'POST',
            headers: { 'content-type': 'application/json', accept: 'application/json' },
            body: JSON.stringify({ q: text, limit }),
            ...(signal === undefined ? {} : { signal: signal.signal }),
          })
          if (mine !== generation) return
          if (response === null || typeof response !== 'object' || response.ok !== true) {
            // The shape of the refusal decides the sentence: a route this build
            // does not have is a restart, a wrong route or a proxy answer is not
            // ours to read, and a 429 is a queue rather than a fault.
            const status = Number(response?.status) || 0
            const reason = status === 404
              ? 'route-missing'
              : status === 429 ? 'busy' : status === 405 ? 'unexpected' : `http-${status}`
            settle(mine, { status: 'error', reason, message: '' })
            log({ phase: 'failed', action: 'ask', reason: `http-${status}` })
            return
          }
          let answer
          try {
            answer = await response.json()
          } catch (error) {
            // A body we cannot parse is HTML, a proxy page, or a dev server.
            settle(mine, { status: 'error', reason: 'unexpected', message: '' })
            log({ phase: 'failed', action: 'ask', reason: 'unparsable' })
            return
          }
          if (mine !== generation) return
          if (answer === null || typeof answer !== 'object' || answer.ok !== true) {
            const reason = String(answer?.reason ?? 'error')
            settle(mine, { status: 'error', reason, message: String(answer?.message ?? '') })
            log({ phase: 'failed', action: 'ask', reason })
            return
          }
          settle(mine, {
            status: 'result',
            answer: typeof answer.answer === 'string' ? answer.answer : '',
            candidates: searchAskCandidates(answer),
            usedTool: answer.usedTool === true,
            turns: Number(answer.turns) || 0,
            elapsedMs: Number(answer.elapsedMs) || 0,
          })
          log({ phase: 'asked', candidates: searchAskCandidates(answer).length })
        } catch (error) {
          settle(mine, { status: 'error', reason: messageOf(error) })
          log({ phase: 'failed', action: 'ask', reason: messageOf(error) })
        } finally {
          if (controller === signal) controller = undefined
        }
      }

      return {
        /** Submit one question; a previous run is cancelled first. */
        submit(query) {
          const text = String(query ?? '').trim()
          cancel()
          const mine = generation
          if (text === '') {
            settle(mine, { status: 'error', reason: 'too-short' })
            return false
          }
          onPatch({ status: 'running', step: 'searching', query: text })
          stepper = setTimeout(() => {
            stepper = undefined
            settle(mine, { status: 'running', step: 'reading', query: text })
          }, stepMs)
          timer = setTimeout(() => {
            timer = undefined
            if (mine !== generation) return
            generation++
            if (controller !== undefined) {
              try {
                controller.abort()
              } catch (error) {
                // Already settled.
              }
              controller = undefined
            }
            onPatch({ status: 'error', reason: 'timeout' })
            log({ phase: 'failed', action: 'ask', reason: 'timeout' })
          }, timeoutMs)
          void run(text, mine)
          return true
        },
        cancel,
        generation: () => generation,
      }
    }

    /** The candidate conversations from one answer, tolerating the older name. */
    function searchAskCandidates(answer) {
      const source = Array.isArray(answer?.candidates)
        ? answer.candidates
        : Array.isArray(answer?.results) ? answer.results : []
      const rows = []
      for (const entry of source) {
        if (entry === null || typeof entry !== 'object') continue
        const sessionId = typeof entry.sessionId === 'string' ? entry.sessionId : ''
        if (sessionId === '') continue
        const snippet = typeof entry.snippet === 'string' ? entry.snippet : ''
        rows.push({
          sessionId,
          title: notifyClampText(entry.sessionTitle, 48),
          reason: notifyClampText(entry.reason, 90),
          segments: searchSegments(notifyClampText(snippet, 120), ''),
          time: Number(entry.time) || 0,
        })
        if (rows.length >= SEARCH_ASK_LIMIT) break
      }
      return rows
    }

    /** What the sentence under the section says for one failed lookup. */
    /**
     * The sentence under the Chat section for one failed lookup.
     *
     * One generic "could not search" told the reader nothing. Each shape a
     * failure can take now names the actual remedy: a missing route is a restart
     * (the running build predates the row), an index that has not been built is
     * a wait, a missing model is a setting. The Host's own sentence still wins
     * whenever it gives one — except for `unavailable` with an index message,
     * where its text ("index not built") is exactly what the long sentence says.
     */
    function searchAskFailure(reason, message, t) {
      const shape = String(reason ?? '')
      const text = typeof message === 'string' ? message.trim() : ''
      if (shape === 'too-short') return t('searchAskTooShort')
      if (shape === 'timeout') return t('searchAskTimeout')
      if (shape === 'no-model') return t('searchAskNoModel')
      if (shape === 'busy') return t('searchAskBusy')
      // `POST api/edh.ask` is not mounted: the app is running a build without it.
      if (shape === 'route-missing') return t('searchAskRestart')
      // 405, an HTML body, a proxy page: an answer that is not ours to read.
      if (shape === 'unexpected') return t('searchAskUnexpected')
      if (shape === 'unavailable') {
        return text === '' || /index|build/iu.test(text) ? t('searchAskNoIndex') : text
      }
      if (shape === 'no-fetch') return t('searchAskUnavailable')
      return text === '' ? t('searchAskFailed') : text
    }

    /** The first Messages row, so "Search messages instead" can move the caret there. */
    function searchFirstMessageIndex(rows) {
      const list = Array.isArray(rows) ? rows : []
      const at = list.findIndex(row => row !== null && typeof row === 'object' && row.kind === 'message')
      return at < 0 ? 0 : at
    }

    /**
     * Open one conversation from a palette row: close, then navigate.
     *
     * The palette never creates a session; it only ever opens one that already
     * exists. A missing workspace is reported, never thrown.
     */
    function openSessionRow(faces, sessionId, log) {
      const id = typeof sessionId === 'string' ? sessionId.trim() : ''
      if (id === '') return { ok: false, reason: 'no-session' }
      const workspace = faces?.uiWorkspace
      if (typeof workspace?.openSession !== 'function') return { ok: false, reason: 'no-workspace' }
      try {
        workspace.openSession({ kind: 'session', sessionId: id })
        if (typeof log === 'function') log({ phase: 'opened-session', sessionId: id })
        return { ok: true }
      } catch (error) {
        return { ok: false, reason: messageOf(error) }
      }
    }

    /** Arrow movement over one flat list, wrapping at both ends. */
    function searchMoveIndex(index, count, delta) {
      if (!Number.isFinite(count) || count <= 0) return 0
      const from = Number.isFinite(index) ? index : 0
      const next = (from + delta) % count
      return next < 0 ? next + count : next
    }

    /**
     * The debounced, cancellable, stale-proof message search.
     *
     * Three facts it owns: a query is asked once after the reader stops typing, a
     * newer query aborts the older request, and an answer whose generation is no
     * longer current is discarded — so a slow reply for "abc" can never overwrite
     * the results for "abcd".
     * @param options - fetch, the debounce, the limit, and a state listener.
     */
    function createSearchRunner(options = {}) {
      const request = options.fetch ?? (typeof fetch === 'function' ? fetch : undefined)
      const debounceMs = Number.isFinite(Number(options.debounceMs)) ? Number(options.debounceMs) : SEARCH_DEBOUNCE_MS
      const limit = Number.isFinite(Number(options.limit)) ? Number(options.limit) : SEARCH_LIMIT
      const onChange = typeof options.onChange === 'function' ? options.onChange : () => {}
      const log = typeof options.log === 'function' ? options.log : () => {}
      let generation = 0
      let timer
      let controller

      const settle = (mine, state) => {
        if (mine !== generation) return
        onChange(state)
      }

      const cancel = () => {
        generation++
        if (timer !== undefined) {
          clearTimeout(timer)
          timer = undefined
        }
        if (controller !== undefined) {
          try {
            controller.abort()
          } catch (error) {
            // An already-finished request has nothing to abort.
          }
          controller = undefined
        }
      }

      const run = async (query, mine) => {
        if (typeof request !== 'function') {
          settle(mine, { status: 'error', query, rows: [], indexed: null, truncated: false, reason: 'no-fetch' })
          return
        }
        const signal = typeof AbortController === 'function' ? new AbortController() : undefined
        controller = signal
        try {
          const url = `${SEARCH_ROUTE}?${new URLSearchParams({ q: query, limit: String(limit) }).toString()}`
          const response = await request(url, signal === undefined ? {} : { signal: signal.signal })
          if (response === null || typeof response !== 'object' || response.ok !== true) {
            log({ phase: 'failed', action: 'search', reason: String(response?.status ?? 'no-response') })
            settle(mine, { status: 'error', query, rows: [], indexed: null, truncated: false, reason: 'http' })
            return
          }
          const answer = await response.json()
          if (answer === null || typeof answer !== 'object' || answer.ok !== true) {
            log({ phase: 'failed', action: 'search', reason: String(answer?.reason ?? 'refused') })
            settle(mine, { status: 'error', query, rows: [], indexed: null, truncated: false, reason: String(answer?.reason ?? 'refused') })
            return
          }
          const rows = searchMessageRows(answer, query)
          settle(mine, {
            status: 'ready',
            query,
            rows,
            indexed: answer.indexed ?? null,
            truncated: answer.truncated === true,
          })
          log({ phase: 'results', sessions: 0, messages: rows.length })
        } catch (error) {
          if (mine !== generation) return
          log({ phase: 'failed', action: 'search', reason: messageOf(error) })
          settle(mine, { status: 'error', query, rows: [], indexed: null, truncated: false, reason: messageOf(error) })
        } finally {
          if (controller === signal) controller = undefined
        }
      }

      return {
        /** Ask for one query; empty text resets to idle without a request. */
        ask(text) {
          cancel()
          const mine = generation
          const query = String(text ?? '').trim()
          if (query === '') {
            settle(mine, { status: 'idle', query: '', rows: [], indexed: null, truncated: false })
            log({ phase: 'query', length: 0 })
            return
          }
          log({ phase: 'query', length: query.length })
          settle(mine, { status: 'loading', query, rows: [], indexed: null, truncated: false })
          timer = setTimeout(() => {
            timer = undefined
            void run(query, mine)
          }, debounceMs)
        },
        cancel,
        /** Where the current generation stands, for a diagnostic. */
        generation: () => generation,
      }
    }

    /**
     * The tiny open/close channel the button, the shortcut and the palette share.
     *
     * The two slot entries are separate components, so a closed-over bus keeps
     * them from needing a store; `open` is idempotent, which is what makes a
     * second Ctrl+K harmless.
     */
    function createPaletteBus() {
      const listeners = new Set()
      let open = false
      let via = ''
      const publish = () => {
        for (const listener of [...listeners]) {
          try {
            listener(open, via)
          } catch (error) {
            // A listener that throws must not break the others.
          }
        }
      }
      return {
        subscribe(listener) {
          listeners.add(listener)
          return () => listeners.delete(listener)
        },
        open(source) {
          via = String(source ?? '')
          if (open) return
          open = true
          publish()
        },
        close() {
          if (!open) return
          open = false
          publish()
        },
        toggle(source) {
          if (open) this.close()
          else this.open(source)
        },
        isOpen: () => open,
        via: () => via,
      }
    }

    /**
     * The shipped sidebar magnifier's accessible names, in both shipped locales.
     *
     * Verified from the installed asar: `dsh-client-ui-workspace` renders its
     * search trigger as `<button type="button" aria-label={t('search.sessions.aria')}
     * aria-keyshortcuts=… aria-expanded=…><IconSearchOutlineRegular /></button>`,
     * and that dictionary entry is "Search sessions" (en) / "搜索会话" (zh). The
     * accessible name is the only anchor a build is likely to keep — the class
     * names are hashed (`GAkraW_searchButton`) and the icon is a component.
     */
    const SEARCH_TRIGGER_LABELS = ['Search sessions', '搜索会话']

    /**
     * The shipped magnifier for one click target, or undefined.
     *
     * Walks up to the nearest button (the click usually lands on the glyph inside
     * it) and compares its accessible name, falling back to `title`.
     * @param target - the event target.
     * @param labels - the names to accept.
     */
    function searchTriggerOf(target, labels = SEARCH_TRIGGER_LABELS) {
      if (target === null || typeof target !== 'object') return undefined
      const closest = typeof target.closest === 'function' ? target.closest('button, [role="button"]') : undefined
      if (closest === undefined || closest === null || typeof closest.getAttribute !== 'function') return undefined
      const raw = closest.getAttribute('aria-label') ?? closest.getAttribute('title') ?? ''
      const name = String(raw).trim().toLowerCase()
      if (name === '') return undefined
      const wanted = (Array.isArray(labels) ? labels : SEARCH_TRIGGER_LABELS).map(label => String(label).trim().toLowerCase())
      return wanted.includes(name) ? closest : undefined
    }

    /**
     * Make the sidebar's own magnifier open *our* palette instead of the shipped
     * inline search.
     *
     * One delegated capture-phase listener on the document, because the sidebar
     * re-renders and a one-shot query would go stale: capture runs before the
     * React root's own listeners, so `stopPropagation` means the shipped button's
     * `onClick` (which expands the inline field) and its wrapper's `onClick` both
     * never fire. A click anywhere else is left completely alone; an element that
     * is not found costs nothing, and Ctrl+K keeps working regardless.
     * @param options - the document, the names, and what to open.
     * @returns the disposer.
     */
    function installSearchTriggerGuard(options = {}) {
      const doc = options.document ?? (typeof document === 'undefined' ? undefined : document)
      if (doc === undefined || doc === null || typeof doc.addEventListener !== 'function') return () => {}
      const labels = Array.isArray(options.labels) ? options.labels : SEARCH_TRIGGER_LABELS
      const open = typeof options.open === 'function' ? options.open : () => {}
      const log = typeof options.log === 'function' ? options.log : searchWrite
      const onClick = event => {
        let found
        try {
          found = searchTriggerOf(event?.target, labels)
        } catch (error) {
          return
        }
        if (found === undefined) return
        if (typeof event.preventDefault === 'function') event.preventDefault()
        if (typeof event.stopPropagation === 'function') event.stopPropagation()
        log({ phase: 'intercepted', via: 'magnifier' })
        open()
      }
      doc.addEventListener('click', onClick, true)
      return () => {
        try {
          doc.removeEventListener('click', onClick, true)
        } catch (error) {
          // A document already torn down has nothing to detach.
        }
      }
    }

    /** The one glyph: a magnifier, at the section scale the harness uses. */
    function searchGlyph() {
      return h('svg', {
        width: 16,
        height: 16,
        viewBox: '0 0 16 16',
        fill: 'none',
        stroke: 'currentColor',
        strokeWidth: 1.4,
        strokeLinecap: 'round',
        'aria-hidden': 'true',
      }, [
        h('circle', { key: 'lens', cx: 7, cy: 7, r: 4.2 }),
        h('path', { key: 'handle', d: 'M10.2 10.2 13.4 13.4' }),
      ])
    }

    /**
     * The palette, as a pure tree.
     *
     * Pure on purpose: the component holds the state, this decides what the
     * reader sees, so the suite can assert the layout, the sections, the notes
     * and the key hints without a browser.
     * @param view - state, rows, and the handlers.
     */
    function searchPaletteView(view = {}) {
      const t = typeof view.t === 'function' ? view.t : key => key
      const state = view.state ?? {}
      const sections = Array.isArray(view.sections) ? view.sections : []
      const rows = Array.isArray(view.rows) ? view.rows : []
      const active = Number(view.active) || 0
      const handlers = view.handlers ?? {}
      const indexOf = key => rows.findIndex(row => row.key === key)

      const rowNode = row => h('button', {
        key: row.key,
        type: 'button',
        className: `edh-palette-row${indexOf(row.key) === active ? ' edh-palette-row-active' : ''}`,
        'data-kind': row.kind,
        role: 'option',
        'aria-selected': indexOf(row.key) === active,
        onMouseEnter: typeof handlers.onHover === 'function' ? () => handlers.onHover(indexOf(row.key)) : undefined,
        onClick: typeof handlers.onActivate === 'function' ? () => handlers.onActivate(row) : undefined,
      }, [
        h('span', { key: 'label', className: 'edh-palette-row-label' }, (row.segments ?? []).length > 0
          ? row.segments.map((segment, at) => (segment.hit
            ? h('strong', { key: at, className: 'edh-palette-hit' }, segment.text)
            : h('span', { key: at }, segment.text)))
          : row.label),
        row.meta === '' || row.meta === undefined
          ? null
          : h('span', { key: 'meta', className: 'edh-palette-row-meta' }, row.meta),
      ])

      const sectionNode = section => {
        const note = section.note === '' || section.note === undefined
          ? null
          : h('p', {
            key: 'note',
            className: 'edh-palette-note',
            // The running line is the only thing that changes without a keypress.
            ...(section.live === true ? { 'aria-live': 'polite', role: 'status' } : {}),
          }, section.note)
        const head = h('div', { key: 'head', className: 'edh-palette-section-head' }, [
          h('span', { key: 'label', className: 'edh-palette-section-label' }, section.label),
          section.id === 'messages' && state.truncated === true
            ? h('span', { key: 'trunc', className: 'edh-palette-section-note' }, t('searchTruncated'))
            : null,
          section.cancel === true
            ? h('button', {
              key: 'cancel',
              type: 'button',
              className: 'edh-palette-cancel',
              onClick: typeof handlers.onCancelAsk === 'function' ? () => handlers.onCancelAsk() : undefined,
            }, t('searchAskCancel'))
            : null,
        ])
        const answer = section.answer === '' || section.answer === undefined
          ? null
          // Plain text, exactly as the model wrote it: never markdown, never HTML.
          : h('p', { key: 'answer', className: 'edh-palette-answer' }, section.answer)
        return h('section', { key: section.id, className: 'edh-palette-section' }, section.id === 'chat'
          ? [head, answer, note, ...section.rows.map(rowNode)]
          : [head, ...section.rows.map(rowNode), note])
      }

      return h('div', {
        className: 'edh-palette-layer',
        onClick: event => {
          if (event.target === event.currentTarget && typeof handlers.onClose === 'function') handlers.onClose()
        },
      }, [
        h('div', {
          key: 'panel',
          className: 'edh-palette',
          role: 'dialog',
          'aria-modal': 'true',
          'aria-label': t('searchOpen'),
        }, [
          h('div', { key: 'search', className: 'edh-palette-search' }, [
            h('span', { key: 'glyph', className: 'edh-palette-glyph' }, searchGlyph()),
            h('input', {
              key: 'input',
              ref: view.inputRef,
              className: 'edh-palette-input',
              type: 'text',
              value: state.query ?? '',
              placeholder: t('searchPlaceholder'),
              'aria-label': t('searchPlaceholder'),
              autoComplete: 'off',
              spellCheck: false,
              onInput: event => {
                if (typeof handlers.onChange === 'function') handlers.onChange(event.target.value)
              },
              onKeyDown: event => {
                if (typeof handlers.onKeyDown === 'function') handlers.onKeyDown(event)
              },
            }),
            h('button', {
              key: 'esc',
              type: 'button',
              className: 'edh-palette-esc',
              onClick: typeof handlers.onClose === 'function' ? () => handlers.onClose() : undefined,
            }, t('searchEsc')),
          ]),
          h('div', { key: 'body', className: 'edh-palette-body', role: 'listbox', 'aria-label': t('searchOpen') },
            sections.map(sectionNode)),
          h('div', { key: 'foot', className: 'edh-palette-foot' }, [
            h('span', { key: 'move', className: 'edh-palette-hint' }, t('searchHintMove')),
            h('span', { key: 'open', className: 'edh-palette-hint' }, t('searchHintOpen')),
            h('span', { key: 'close', className: 'edh-palette-hint' }, t('searchHintClose')),
          ]),
        ]),
      ])
    }

    /**
     * The live palette: state, keys, focus, and the two seams it drives.
     *
     * Every visual decision is in `searchPaletteView`; this owns only the state
     * the view reads, so the suite tests the tree rather than a browser.
     * @param t - the dictionary.
     * @param bus - the open/close channel.
     * @param faces - optional services: sessions, uiWorkspace, layout, shortcuts.
     */
    function createSearchPalette(t, bus, faces = {}) {
      const idle = { status: 'idle', rows: [], indexed: null, truncated: false }

      return function SearchPalette() {
        const [state, setState] = React.useState(searchInitialState(false))
        const inputRef = React.useRef(null)
        const returnTo = React.useRef(null)
        const runner = React.useRef(null)
        const askRunner = React.useRef(null)

        const ask = React.useCallback(text => {
          if (runner.current === null) {
            runner.current = createSearchRunner({
              fetch: faces.fetch,
              debounceMs: SEARCH_DEBOUNCE_MS,
              limit: SEARCH_LIMIT,
              log: searchWrite,
              onChange: next => setState(previous => ({ ...previous, messages: next, active: 0 })),
            })
          }
          runner.current.ask(text)
        }, [])

        React.useEffect(() => bus.subscribe((open, via) => {
          if (open) {
            // Opening always starts clean: a stale query is never restored.
            runner.current?.cancel()
            askRunner.current?.cancel()
            searchWrite({ phase: 'opened', via: String(via ?? '') })
            setState(searchInitialState(true))
            return
          }
          askRunner.current?.cancel()
          setState(previous => (previous.open ? searchInitialState(false) : previous))
        }), [bus])

        React.useEffect(() => {
          if (!state.open) return undefined
          returnTo.current = typeof document === 'undefined' ? null : document.activeElement
          const focus = () => {
            try {
              inputRef.current?.focus()
            } catch (error) {
              // A palette that cannot take focus still works with the mouse.
            }
          }
          const frame = typeof requestAnimationFrame === 'function'
            ? requestAnimationFrame(focus)
            : setTimeout(focus, 0)
          return () => {
            if (typeof cancelAnimationFrame === 'function') cancelAnimationFrame(frame)
            else clearTimeout(frame)
            const previous = returnTo.current
            try {
              if (previous !== null && typeof previous.focus === 'function') previous.focus()
            } catch (error) {
              // Returning focus is best effort.
            }
          }
        }, [state.open])

        const close = React.useCallback(() => bus.close(), [bus])

        const sessions = React.useMemo(
          () => (state.open
            ? searchSessionRows(faces.sessions?.list?.getSnapshot?.()?.byId, state.query)
            : []),
          [state.query, state.open],
        )
        const built = React.useMemo(
          () => searchRowsFor({ query: state.query, sessions, messages: state.messages, ask: state.ask, t }),
          [state.query, sessions, state.messages, state.ask],
        )

        /** Ask the agent which existing conversation the words belong to. */
        const submitAsk = text => {
          if (askRunner.current === null) {
            askRunner.current = createAskRunner({
              fetch: faces.fetch,
              onPatch: patch => setState(previous => ({ ...previous, ask: patch, active: 0 })),
              log: searchWrite,
            })
          }
          askRunner.current.submit(text)
        }

        const run = row => {
          if (row === null || typeof row !== 'object') return
          const payload = row.payload ?? {}
          if (row.kind === 'chat' || row.kind === 'ask-again' || row.kind === 'ask-retry') {
            const query = String(payload.query ?? state.query ?? '')
            if (query.trim() !== '') {
              setState(previous => ({ ...previous, query }))
              submitAsk(query)
            }
            return
          }
          if (row.kind === 'messages') {
            // Move the caret to the first message row rather than opening anything.
            setState(previous => ({ ...previous, active: searchFirstMessageIndex(built.rows) }))
            return
          }
          if (row.kind === 'candidate' || row.kind === 'session') {
            close()
            const opened = openSessionRow(faces, String(payload.sessionId ?? ''), searchWrite)
            if (!opened.ok) searchWrite({ phase: 'failed', action: 'open', reason: opened.reason })
            return
          }
          if (row.kind === 'retry') {
            ask(String(payload.query ?? state.query))
            return
          }
          if (row.kind === 'action') {
            close()
            const done = runSearchAction(faces, String(payload.action ?? ''))
            if (!done.ok) searchWrite({ phase: 'failed', action: String(payload.action ?? ''), reason: done.reason })
          }
        }

        const onKeyDown = event => {
          const key = event?.key ?? ''
          if (key === 'Escape') {
            if (typeof event.preventDefault === 'function') event.preventDefault()
            close()
            return
          }
          if (key === 'ArrowDown' || key === 'ArrowUp') {
            if (typeof event.preventDefault === 'function') event.preventDefault()
            const delta = key === 'ArrowDown' ? 1 : -1
            setState(previous => ({ ...previous, active: searchMoveIndex(previous.active, built.rows.length, delta) }))
            return
          }
          if (key === 'Home' || key === 'End') {
            if (typeof event.preventDefault === 'function') event.preventDefault()
            setState(previous => ({
              ...previous,
              active: key === 'Home' ? 0 : Math.max(0, built.rows.length - 1),
            }))
            return
          }
          if (key === 'Tab') {
            // One focusable surface: keep the caret in the input.
            if (typeof event.preventDefault === 'function') event.preventDefault()
            return
          }
          if (key === 'Enter') {
            if (typeof event.preventDefault === 'function') event.preventDefault()
            run(built.rows[state.active] ?? built.rows[0])
          }
        }

        if (!state.open) return null
        return searchPaletteView({
          t,
          state: { ...state, truncated: state.messages.truncated === true },
          sections: built.sections,
          rows: built.rows,
          active: state.active,
          inputRef,
          handlers: {
            onChange: text => {
              setState(previous => ({ ...previous, query: text, active: 0 }))
              ask(text)
            },
            onHover: index => setState(previous => ({ ...previous, active: index })),
            onActivate: run,
            onKeyDown,
            onClose: close,
            onCancelAsk: () => {
              askRunner.current?.cancel()
              setState(previous => ({ ...previous, ask: { status: 'idle' }, active: 0 }))
              searchWrite({ phase: 'ask-cancelled' })
            },
          },
        })
      }
    }

    /** Run one Actions row, through the services that actually exist. */
    function runSearchAction(faces, action) {
      if (action === 'settings') {
        const shortcuts = faces?.shortcuts
        if (shortcuts !== undefined && typeof shortcuts.invoke === 'function') {
          try {
            shortcuts.invoke('settings.open', { modal: null, source: 'menu' })
            return { ok: true }
          } catch (error) {
            return { ok: false, reason: messageOf(error) }
          }
        }
        return { ok: false, reason: 'no-shortcuts' }
      }
      if (action === 'sidebar') {
        const layout = faces?.layout
        if (typeof layout?.toggleSidebar === 'function') {
          try {
            layout.toggleSidebar()
            return { ok: true }
          } catch (error) {
            return { ok: false, reason: messageOf(error) }
          }
        }
        return { ok: false, reason: 'no-layout' }
      }
      if (action === 'conversation') {
        const layout = faces?.layout
        if (typeof layout?.selectPanel === 'function') {
          try {
            layout.selectPanel(null)
            return { ok: true }
          } catch (error) {
            return { ok: false, reason: messageOf(error) }
          }
        }
        return { ok: false, reason: 'no-layout' }
      }
      return { ok: false, reason: 'unknown-action' }
    }

    /** The sidebar button, in the rail's 56px form and the wide form. */
    function createSearchButton(t, bus) {
      return function SearchButton(props) {
        const wide = props?.wide === true
        return h('button', {
          type: 'button',
          className: `edh-search-button${wide ? ' edh-search-button-wide' : ''}`,
          title: t('searchOpen'),
          'aria-label': t('searchOpen'),
          onClick: () => bus.open('button'),
        }, [
          h('span', { key: 'glyph', className: 'edh-search-button-glyph' }, searchGlyph()),
          wide ? h('span', { key: 'label', className: 'edh-search-button-label' }, t('searchOpen')) : null,
        ])
      }
    }

    const SEARCH_CSS = `
.edh-search-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 28px;
  height: 28px;
  padding: 0;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--dsw-alias-label-secondary);
  cursor: pointer;
  transition: background-color 120ms ease, color 120ms ease;
}
.edh-search-button:hover { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-primary); }
.edh-search-button:focus-visible { outline: 2px solid var(--dsw-alias-brand-primary); outline-offset: 2px; }
.edh-search-button-wide { width: auto; height: 28px; padding: 0 8px; justify-content: flex-start; }
.edh-search-button-glyph { display: inline-flex; align-items: center; justify-content: center; }
.edh-search-button-label { font-size: 13px; line-height: 16px; }

.edh-palette-layer {
  position: fixed;
  inset: 0;
  z-index: 4000;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 12vh 16px 16px;
  background: color-mix(in srgb, var(--dsw-alias-bg-base) 46%, transparent);
}
.edh-palette {
  width: 640px;
  max-width: 100%;
  max-height: 72vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid var(--dsw-alias-border-l);
  border-radius: 14px;
  background: var(--dsw-alias-bg-layer-1);
  box-shadow: 0 24px 64px -16px color-mix(in srgb, var(--dsw-alias-bg-base) 70%, transparent);
  animation: edh-palette-in 120ms ease-out;
}
@keyframes edh-palette-in {
  from { opacity: 0; transform: translateY(-6px); }
  to { opacity: 1; transform: translateY(0); }
}
@media (prefers-reduced-motion: reduce) {
  .edh-palette { animation: none; }
  .edh-search-button { transition: none; }
}
.edh-palette-search {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px 12px;
  border-bottom: 1px solid var(--dsw-alias-border-l);
}
.edh-palette-glyph { display: inline-flex; color: var(--dsw-alias-label-tertiary); }
.edh-palette-input {
  flex: 1;
  min-width: 0;
  border: none;
  outline: none;
  background: transparent;
  color: var(--dsw-alias-label-primary);
  font-size: 15px;
  line-height: 22px;
}
.edh-palette-input::placeholder { color: var(--dsw-alias-label-tertiary); }
.edh-palette-esc {
  flex: none;
  padding: 2px 6px;
  border: 1px solid var(--dsw-alias-border-l);
  border-radius: 5px;
  background: transparent;
  color: var(--dsw-alias-label-tertiary);
  font-size: 11px;
  line-height: 16px;
  cursor: pointer;
}
.edh-palette-esc:hover { color: var(--dsw-alias-label-secondary); }
.edh-palette-body { overflow-y: auto; padding: 6px 0 8px; }
.edh-palette-section { padding: 6px 8px 4px; }
.edh-palette-section + .edh-palette-section { border-top: 1px solid var(--dsw-alias-border-l); }
.edh-palette-section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 8px 6px;
}
.edh-palette-section-label { color: var(--dsw-alias-label-tertiary); font-size: 11px; line-height: 16px; }
.edh-palette-section-note { color: var(--dsw-alias-label-dimmed); font-size: 11px; line-height: 16px; }
.edh-palette-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  height: 34px;
  padding: 0 8px;
  border: none;
  border-radius: 7px;
  background: transparent;
  color: var(--dsw-alias-label-primary);
  text-align: left;
  font-size: 13px;
  line-height: 18px;
  cursor: pointer;
}
.edh-palette-row-active { background: var(--dsw-alias-interactive-bg-hover); }
.edh-palette-row:focus-visible { outline: 2px solid var(--dsw-alias-brand-primary); outline-offset: -2px; }
.edh-palette-row-label { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.edh-palette-hit { font-weight: 600; color: inherit; }
.edh-palette-row-meta { flex: none; color: var(--dsw-alias-label-tertiary); font-size: 11px; line-height: 16px; }
.edh-palette-answer { margin: 2px 8px 8px; color: var(--dsw-alias-label-secondary); font-size: 12px; line-height: 18px; }
.edh-palette-cancel {
  flex: none;
  padding: 2px 8px;
  border: 1px solid var(--dsw-alias-border-l);
  border-radius: 5px;
  background: transparent;
  color: var(--dsw-alias-label-tertiary);
  font-size: 11px;
  line-height: 16px;
  cursor: pointer;
}
.edh-palette-cancel:hover { color: var(--dsw-alias-label-primary); }
.edh-palette-cancel:focus-visible { outline: 2px solid var(--dsw-alias-brand-primary); outline-offset: 1px; }
.edh-palette-note { margin: 2px 8px 6px; color: var(--dsw-alias-label-tertiary); font-size: 12px; line-height: 18px; }
.edh-palette-foot {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 8px 16px;
  border-top: 1px solid var(--dsw-alias-border-l);
}
.edh-palette-hint { color: var(--dsw-alias-label-dimmed); font-size: 11px; line-height: 16px; }
`

    /** Inject the palette's one stylesheet, once. */
    function installSearchStyles() {
      if (typeof document === 'undefined') return () => {}
      const existing = document.getElementById('edh-search-style')
      if (existing !== null) return () => {}
      const style = document.createElement('style')
      style.id = 'edh-search-style'
      style.textContent = SEARCH_CSS
      document.head.appendChild(style)
      return () => {
        try {
          style.remove()
        } catch (error) {
          // A head that is already gone has nothing to remove.
        }
      }
    }

    // ------------------------------------------------------------ skills page
    const SKILLS_MODULE = '@moreweb/edh/skills'
    const SKILLS_SECTION_SLOT = 'settings.section'
    const SKILLS_SECTION_ORDER = 20
    const SKILLS_ROUTE = 'api/edh.skills'
    const SKILLS_DEBUG_KEY = 'edh:skills'
    const SKILLS_TABS = ['global', 'workspace']
    const SKILLS_DESCRIPTION_MAX = 220

    /** Separate breadcrumb for the Skills page. */
    function skillsWrite(payload) {
      writeBreadcrumb(SKILLS_DEBUG_KEY, payload)
    }

    /**
     * Which session the page should ask about.
     *
     * A Settings page sits outside a session scope, so `uiSession.current` is
     * often undefined here. The order is: the open conversation, then the most
     * recently updated one (the honest "the conversation you were last in"), then
     * nothing at all and the Host's default workspace. The `source` is carried
     * back so the page can say which of those it means instead of claiming a past
     * session is live.
     * @param options - the current session key and the list rows.
     */
    function skillsScopeOf(options = {}) {
      const key = typeof options.currentKey === 'string' ? options.currentKey.trim() : ''
      if (key !== '') return { sessionId: key, source: 'session', updatedAt: 0 }
      let newest
      for (const row of Array.isArray(options.rows) ? options.rows : []) {
        if (row === null || typeof row !== 'object') continue
        const id = typeof row.sessionId === 'string' ? row.sessionId : typeof row.id === 'string' ? row.id : ''
        if (id === '') continue
        const updatedAt = Number(row.updatedAt) || 0
        if (newest === undefined || updatedAt > newest.updatedAt) newest = { sessionId: id, updatedAt }
      }
      if (newest !== undefined) return { sessionId: newest.sessionId, source: 'recent', updatedAt: newest.updatedAt }
      return { sessionId: '', source: 'default', updatedAt: 0 }
    }

    /** The exact request for one scope: no id means the Host's default workspace. */
    function skillsUrl(scope) {
      const id = typeof scope?.sessionId === 'string' ? scope.sessionId.trim() : ''
      if (id === '') return SKILLS_ROUTE
      return `${SKILLS_ROUTE}?${new URLSearchParams({ sessionId: id }).toString()}`
    }

    /** A skill row, with the two facts the page actually states. */
    function skillsRowOf(entry) {
      if (entry === null || typeof entry !== 'object') return undefined
      const name = typeof entry.name === 'string' ? entry.name.trim() : ''
      if (name === '') return undefined
      const source = typeof entry.source === 'string' ? entry.source : ''
      const description = typeof entry.description === 'string' ? entry.description : ''
      const full = typeof entry.descriptionFull === 'string' && entry.descriptionFull !== '' ? entry.descriptionFull : description
      return {
        key: `${source}:${name}`,
        name,
        description: notifyClampText(description, SKILLS_DESCRIPTION_MAX),
        descriptionFull: full,
        whenToUse: typeof entry.whenToUse === 'string' ? entry.whenToUse : '',
        source,
        sourceWord: source === 'user-agents' ? 'global' : source === 'project-agents' ? 'project' : source,
        userOnly: entry.modelInvocable === false,
        path: typeof entry.path === 'string' && entry.path.trim() !== '' ? entry.path : '',
      }
    }

    /** The two lists, tolerating the older `skills` name for the global array. */
    function skillsLists(answer) {
      const global = Array.isArray(answer?.global) ? answer.global
        : Array.isArray(answer?.skills) ? answer.skills : []
      const workspace = Array.isArray(answer?.workspace) ? answer.workspace : []
      const rowify = list => list.map(skillsRowOf).filter(row => row !== undefined)
      return { global: rowify(global), workspace: rowify(workspace) }
    }

    /** The counts beside the tab labels: the Host's own, or the list lengths. */
    function skillsCounts(answer) {
      const lists = skillsLists(answer)
      const counts = answer !== null && typeof answer === 'object' && answer.counts !== null && typeof answer.counts === 'object'
        ? answer.counts
        : undefined
      return {
        global: Number.isFinite(Number(counts?.global)) ? Number(counts.global) : lists.global.length,
        workspace: Number.isFinite(Number(counts?.workspace)) ? Number(counts.workspace) : lists.workspace.length,
      }
    }

    /** The rows one tab shows after the filter box. */
    function skillsVisible(answer, tab, query) {
      const lists = skillsLists(answer)
      const rows = tab === 'workspace' ? lists.workspace : lists.global
      const needle = String(query ?? '').trim().toLowerCase()
      if (needle === '') return rows
      return rows.filter(row => row.name.toLowerCase().includes(needle) || row.description.toLowerCase().includes(needle))
    }

    /** Arrow keys inside the tablist, wrapping. */
    function skillsNextTab(tab, key) {
      const at = SKILLS_TABS.indexOf(tab === 'workspace' ? 'workspace' : 'global')
      if (key === 'ArrowRight' || key === 'ArrowDown') return SKILLS_TABS[(at + 1) % SKILLS_TABS.length]
      if (key === 'ArrowLeft' || key === 'ArrowUp') return SKILLS_TABS[(at - 1 + SKILLS_TABS.length) % SKILLS_TABS.length]
      if (key === 'Home') return SKILLS_TABS[0]
      if (key === 'End') return SKILLS_TABS[SKILLS_TABS.length - 1]
      return tab
    }

    /** The quiet workspace line: which workspace, and how it was decided. */
    function skillsScopeLine(answer, scope, t) {
      const block = answer !== null && typeof answer === 'object' ? answer.scope : undefined
      const name = typeof block?.workspaceName === 'string' && block.workspaceName.trim() !== ''
        ? block.workspaceName.trim()
        : typeof block?.cwd === 'string' ? block.cwd : ''
      const how = scope?.source === 'session'
        ? t('skillsScopeSession')
        : scope?.source === 'recent' ? t('skillsScopeRecent') : t('skillsScopeDefault')
      if (name === '') return t('skillsNoWorkspace')
      return `${t('skillsWorkspaceLine', { name })} ${how}`
    }

    /** The empty sentence for one scope, and it teaches in the workspace tab. */
    function skillsEmptyText(tab, t) {
      return tab === 'workspace' ? t('skillsEmptyWorkspace') : t('skillsEmptyGlobal')
    }

    /** One skill row: name, description, quiet meta, and a Copy path when there is a path. */
    function skillsRowView(row, t) {
      return h('li', { key: row.key, className: 'edh-skills-row' }, [
        h('div', { key: 'text', className: 'edh-skills-row-text' }, [
          h('div', { key: 'name', className: 'edh-skills-row-name' }, row.name),
          row.description === ''
            ? null
            : h('div', { key: 'desc', className: 'edh-skills-row-desc', title: row.descriptionFull }, row.description),
        ]),
        h('div', { key: 'meta', className: 'edh-skills-row-meta' }, [
          h('span', { key: 'source', className: 'edh-skills-row-source', title: row.source }, row.sourceWord),
          row.userOnly ? h('span', { key: 'user', className: 'edh-skills-row-user' }, t('skillsUserOnly')) : null,
        ]),
        row.path === ''
          ? null
          : h('button', {
            key: 'copy',
            type: 'button',
            className: 'edh-skills-row-copy',
            title: row.path,
            onClick: () => row.onCopy?.(row),
          }, t('skillsCopyPath')),
      ])
    }

    /**
     * Fold one read's outcome into the page state.
     *
     * The rule that matters: a failure of any kind **keeps the list already on
     * screen** and puts its sentence beside it, because a stale list with an error
     * line is more use than an empty page.
     */
    function skillsReduce(state, patch) {
      const current = state !== null && typeof state === 'object' && 'answer' in state
        ? state
        : { status: 'loading', answer: undefined, error: '' }
      const kind = String(patch?.status ?? '')
      if (kind === 'loading') return { ...current, status: current.answer === undefined ? 'loading' : current.status }
      if (kind === 'ready') return { status: 'ready', answer: patch.answer, error: '' }
      if (kind === 'unavailable') return { status: 'unavailable', answer: undefined, error: String(patch.message ?? '') }
      if (kind === 'error') {
        return {
          status: current.answer === undefined ? 'error' : current.status,
          answer: current.answer,
          error: String(patch.message ?? patch.reason ?? ''),
        }
      }
      return current
    }

    /**
     * The page, as a pure tree.
     */
    function skillsView(view = {}) {
      const t = typeof view.t === 'function' ? view.t : key => key
      const tab = view.tab === 'workspace' ? 'workspace' : 'global'
      const state = view.state ?? { status: 'loading', answer: undefined, error: '' }
      const handlers = view.handlers ?? {}
      const answer = state.answer
      const counts = answer === undefined ? { global: 0, workspace: 0 } : skillsCounts(answer)
      const rows = answer === undefined ? [] : skillsVisible(answer, tab, view.query)
      const on = name => (typeof handlers[name] === 'function' ? handlers[name] : undefined)
      const tabNode = (id, label, count) => h('button', {
        key: id,
        type: 'button',
        id: `edh-skills-tab-${id}`,
        role: 'tab',
        className: `edh-skills-tab${tab === id ? ' edh-skills-tab-active' : ''}`,
        'aria-selected': tab === id,
        'aria-controls': `edh-skills-panel-${id}`,
        tabIndex: tab === id ? 0 : -1,
        onClick: () => on('onTab')?.(id),
      }, [
        h('span', { key: 'label', className: 'edh-skills-tab-label' }, label),
        h('span', { key: 'count', className: 'edh-skills-tab-count' }, String(count)),
      ])

      const body = []
      if (state.status === 'loading') body.push(h('p', { key: 'loading', className: 'edh-skills-note' }, t('skillsLoading')))
      if (state.status === 'unavailable') body.push(h('p', { key: 'unavailable', className: 'edh-skills-note' }, t('skillsUnavailable')))
      if (state.status === 'error') {
        body.push(h('div', { key: 'error', className: 'edh-skills-error' }, [
          h('p', { key: 'text', className: 'edh-skills-note' }, state.error === '' ? t('skillsFailed') : state.error),
          h('button', {
            key: 'retry',
            type: 'button',
            className: 'edh-skills-button',
            onClick: on('onRefresh'),
          }, t('skillsRetry')),
        ]))
      }
      if (answer !== undefined && state.status !== 'loading' && state.status !== 'unavailable') {
        if (rows.length === 0) {
          body.push(h('p', { key: 'empty', className: 'edh-skills-note' }, skillsEmptyText(tab, t)))
        } else {
          body.push(h('ul', { key: 'rows', className: 'edh-skills-list' }, rows.map(row => skillsRowView(row, t))))
        }
        if (state.error !== '' && state.status !== 'error') {
          body.push(h('p', { key: 'stale', className: 'edh-skills-note' }, state.error))
        }
        if (answer.complete === false) {
          body.push(h('p', { key: 'incomplete', className: 'edh-skills-note' }, t('skillsIncomplete')))
        }
      }

      const scopeLine = answer === undefined || tab !== 'workspace'
        ? null
        : h('p', { key: 'scope', className: 'edh-skills-scope' }, skillsScopeLine(answer, view.scope, t))

      return h('div', { className: 'edh-skills-page' }, [
        h('div', { key: 'head', className: 'edh-skills-head' }, [
          h('h2', { key: 'title', className: 'edh-skills-title' }, t('skillsTitle')),
          h('p', { key: 'intro', className: 'edh-skills-intro' }, t('skillsIntro')),
        ]),
        h('div', {
          key: 'tabs',
          className: 'edh-skills-tabs',
          role: 'tablist',
          'aria-label': t('skillsTitle'),
          onKeyDown: event => {
            const next = skillsNextTab(tab, String(event?.key ?? ''))
            if (next === tab) return
            if (typeof event?.preventDefault === 'function') event.preventDefault()
            on('onTab')?.(next)
          },
        }, [
          tabNode('global', t('skillsTabGlobal'), counts.global),
          tabNode('workspace', t('skillsTabWorkspace'), counts.workspace),
        ]),
        scopeLine,
        state.status === 'unavailable' ? null : h('div', { key: 'tools', className: 'edh-skills-tools' }, [
          h('input', {
            key: 'filter',
            ref: view.inputRef,
            className: 'edh-skills-filter',
            type: 'search',
            value: view.query ?? '',
            placeholder: t('skillsFilterPlaceholder'),
            'aria-label': t('skillsFilter'),
            onInput: event => on('onQuery')?.(event.target.value),
          }),
          h('button', {
              key: 'refresh',
              type: 'button',
              className: 'edh-skills-button',
              disabled: state.status === 'loading',
              onClick: on('onRefresh'),
            }, t('skillsRefresh')),
        ]),
        h('div', {
          key: 'panel',
          className: 'edh-skills-panel',
          role: 'tabpanel',
          id: `edh-skills-panel-${tab}`,
          'aria-labelledby': `edh-skills-tab-${tab}`,
        }, body),
      ])
    }

    /**
     * The live page: resolve the scope, read once, refresh on demand, filter
     * locally, and talk the two tabs.
     */
    function createSkillsPage(t, faces = {}) {
      return function SkillsPage() {
        const [tab, setTab] = React.useState('global')
        const [query, setQuery] = React.useState('')
        const [state, setState] = React.useState({ status: 'loading', answer: undefined, error: '' })
        const fetched = React.useRef('')
        const inputRef = React.useRef(null)

        const readScope = () => {
          let currentKey = ''
          try {
            currentKey = String(faces.uiSession?.current?.getSnapshot?.()?.key ?? '')
          } catch (error) {
            // An unreadable binding means "no open conversation".
          }
          const byId = faces.sessions?.list?.getSnapshot?.()?.byId
          const rows = byId !== null && typeof byId === 'object' ? Object.values(byId) : []
          return skillsScopeOf({ currentKey, rows })
        }

        const scope = readScope()

        const load = React.useCallback(async (mode) => {
          const request = faces.fetch ?? (typeof fetch === 'function' ? fetch : undefined)
          if (typeof request !== 'function') {
            setState(previous => skillsReduce(previous, { status: 'unavailable' }))
            skillsWrite({ phase: 'failed', action: 'read', reason: 'no-fetch' })
            return
          }
          setState(previous => skillsReduce(previous, { status: 'loading' }))
          try {
            const init = mode === 'refresh'
              ? { method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json' }, body: JSON.stringify({ action: 'refresh' }) }
              : { headers: { accept: 'application/json' } }
            const response = await request(skillsUrl(scope), init)
            if (response === null || typeof response !== 'object' || response.ok !== true) {
              throw new Error(String(response?.status ?? 'no-response'))
            }
            const answer = await response.json()
            if (answer === null || typeof answer !== 'object' || answer.ok !== true) {
              const reason = String(answer?.reason ?? 'refused')
              if (reason === 'unavailable') {
                setState(previous => skillsReduce(previous, { status: 'unavailable', message: String(answer?.message ?? '') }))
              } else {
                // A failed refresh keeps the list that is already on screen.
                setState(previous => skillsReduce(previous, { status: 'error', message: String(answer?.message ?? ''), reason }))
              }
              skillsWrite({ phase: 'failed', action: mode ?? 'read', reason })
              return
            }
            skillsWrite({ phase: 'loaded', global: skillsCounts(answer).global, workspace: skillsCounts(answer).workspace, scope: scope.source })
            setState(previous => skillsReduce(previous, { status: 'ready', answer }))
          } catch (error) {
            // Also keeps whatever is already visible.
            setState(previous => skillsReduce(previous, { status: 'error', message: messageOf(error) }))
            skillsWrite({ phase: 'failed', action: mode ?? 'read', reason: messageOf(error) })
          }
        }, [faces, scope.sessionId])

        React.useEffect(() => {
          // Once per resolved scope: both tabs come from the same answer, so a tab
          // switch never costs a round trip.
          const key = `${scope.source}:${scope.sessionId}`
          if (fetched.current === key) return
          fetched.current = key
          void load('read')
        }, [load, scope.source, scope.sessionId])

        const copy = async row => {
          try {
            const clip = typeof navigator !== 'undefined' ? navigator.clipboard : undefined
            if (clip === undefined || typeof clip.writeText !== 'function') throw new Error('no-clipboard')
            await clip.writeText(row.path)
            skillsWrite({ phase: 'copied', name: row.name })
          } catch (error) {
            skillsWrite({ phase: 'failed', action: 'copy', reason: messageOf(error) })
          }
        }

        const rows = state.answer === undefined ? [] : skillsVisible(state.answer, tab, query)
        const withActions = rows.map(row => ({ ...row, onCopy: copy }))
        const shaped = state.answer === undefined
          ? state
          : { ...state, answer: { ...state.answer, [tab]: withActions, global: tab === 'global' ? withActions : state.answer.global, workspace: tab === 'workspace' ? withActions : state.answer.workspace } }

        return skillsView({
          t,
          tab,
          query,
          scope,
          state: shaped,
          inputRef,
          handlers: {
            onTab: next => setTab(next),
            onQuery: value => setQuery(value),
            onRefresh: () => void load('refresh'),
          },
        })
      }
    }

    const SKILLS_CSS = `
.edh-skills-page { display: flex; flex-direction: column; gap: 0; padding: 24px 28px 40px; max-width: 880px; }
.edh-skills-head { display: flex; flex-direction: column; gap: 4px; margin-bottom: 16px; }
.edh-skills-title { margin: 0; color: var(--dsw-alias-label-primary); font-size: 18px; line-height: 26px; font-weight: 600; }
.edh-skills-intro { margin: 0; color: var(--dsw-alias-label-tertiary); font-size: 13px; line-height: 20px; }
.edh-skills-tabs { display: flex; gap: 4px; border-bottom: 1px solid var(--dsw-alias-border-l); }
.edh-skills-tab {
  display: inline-flex;
  align-items: baseline;
  gap: 6px;
  padding: 8px 10px;
  border: none;
  border-bottom: 2px solid transparent;
  background: transparent;
  color: var(--dsw-alias-label-secondary);
  font-size: 13px;
  line-height: 18px;
  cursor: pointer;
}
.edh-skills-tab:hover { color: var(--dsw-alias-label-primary); }
.edh-skills-tab-active { color: var(--dsw-alias-label-primary); border-bottom-color: var(--dsw-alias-brand-primary); }
.edh-skills-tab:focus-visible, .edh-skills-button:focus-visible, .edh-skills-filter:focus-visible, .edh-skills-row-copy:focus-visible {
  outline: 2px solid var(--dsw-alias-brand-primary);
  outline-offset: 1px;
}
.edh-skills-tab-count { color: var(--dsw-alias-label-tertiary); font-size: 11px; line-height: 16px; font-variant-numeric: tabular-nums; }
.edh-skills-scope { margin: 10px 0 0; color: var(--dsw-alias-label-tertiary); font-size: 12px; line-height: 18px; }
.edh-skills-tools { display: flex; align-items: center; gap: 10px; padding: 12px 0; }
.edh-skills-filter {
  flex: 1 1 auto;
  box-sizing: border-box;
  height: 30px;
  min-width: 160px;
  padding: 0 8px;
  border: 1px solid var(--dsw-alias-border-l);
  border-radius: 7px;
  background: var(--dsw-alias-bg-layer-1);
  color: var(--dsw-alias-label-primary);
  font-size: 13px;
  line-height: 18px;
}
.edh-skills-button {
  flex: none;
  height: 30px;
  padding: 0 12px;
  border: 1px solid var(--dsw-alias-border-l);
  border-radius: 7px;
  background: transparent;
  color: var(--dsw-alias-label-primary);
  font-size: 13px;
  line-height: 18px;
  cursor: pointer;
}
.edh-skills-button:hover { background: var(--dsw-alias-interactive-bg-hover); }
.edh-skills-button:disabled { color: var(--dsw-alias-label-dimmed); background: transparent; cursor: default; }
.edh-skills-panel { display: flex; flex-direction: column; }
.edh-skills-list { list-style: none; margin: 0; padding: 0; }
.edh-skills-row { display: flex; align-items: flex-start; gap: 12px; padding: 10px 0; border-bottom: 1px solid var(--dsw-alias-border-l); }
.edh-skills-row-text { flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.edh-skills-row-name { color: var(--dsw-alias-label-primary); font-size: 13px; line-height: 19px; font-weight: 500; }
.edh-skills-row-desc {
  color: var(--dsw-alias-label-secondary);
  font-size: 12px;
  line-height: 18px;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}
.edh-skills-row-meta { flex: none; display: flex; align-items: baseline; gap: 10px; padding-top: 1px; }
.edh-skills-row-source { color: var(--dsw-alias-label-tertiary); font-size: 11px; line-height: 16px; }
.edh-skills-row-user { color: var(--dsw-alias-label-tertiary); font-size: 11px; line-height: 16px; }
.edh-skills-row-copy {
  flex: none;
  padding: 2px 8px;
  border: 1px solid transparent;
  border-radius: 6px;
  background: transparent;
  color: var(--dsw-alias-label-tertiary);
  font-size: 11px;
  line-height: 16px;
  cursor: pointer;
}
.edh-skills-row-copy:hover { border-color: var(--dsw-alias-border-l); color: var(--dsw-alias-label-primary); }
.edh-skills-note { margin: 10px 0; color: var(--dsw-alias-label-tertiary); font-size: 13px; line-height: 20px; }
.edh-skills-error { display: flex; align-items: center; gap: 12px; }
@media (prefers-reduced-motion: reduce) {
  .edh-skills-button, .edh-skills-tab, .edh-skills-row-copy { transition: none; }
}
`

    /** Inject the page's one stylesheet, once. */
    function installSkillStyles() {
      if (typeof document === 'undefined') return () => {}
      if (document.getElementById('edh-skills-style') !== null) return () => {}
      const style = document.createElement('style')
      style.id = 'edh-skills-style'
      style.textContent = SKILLS_CSS
      document.head.appendChild(style)
      return () => {
        try {
          style.remove()
        } catch (error) {
          // A head that is gone has nothing to remove.
        }
      }
    }

    // -------------------------------------------------------- /reload command
    /**
     * Refresh what the model can see, from the composer.
     *
     * Two guarded POSTs and nothing else: the MCP servers reconnect so their tools
     * are re-listed, the skill registry cache is dropped so the catalog digest
     * changes. It never restarts the plugin, never reloads EDH's browser half
     * (that is the Plugin Manager control), and never creates or resumes a
     * Session — a bare `action` contribution has no Session to move.
     */
    const RELOAD_COMMAND_NAME = 'reload'
    const RELOAD_DEBUG_KEY = 'edh:reload'
    /** Per request. The two together stay inside the ~10 s the command is worth. */
    const RELOAD_TIMEOUT_MS = 5_000
    /** Host commands that already own these tokens; `/reload` must stay absent. */
    const RELOAD_TAKEN_NAMES = ['compact', 'goal', 'feedback', 'permission', 'plan', 'export']

    /** Separate breadcrumb for the command. */
    function reloadWrite(payload) {
      writeBreadcrumb(RELOAD_DEBUG_KEY, payload)
    }

    /**
     * One `{ action: 'refresh' }` POST, capped and never throwing.
     *
     * Two independent bounds: the abort signal where the platform has one, and a
     * race timer here, so a request that ignores its signal still ends. A 404 is
     * reported as `missing` — an older build that has no refresh action at all.
     * @param options - the route, the fetch, and the cap.
     * @returns `{ ok, status, answer }` or `{ ok:false, reason, missing }`.
     */
    async function postRefresh(options = {}) {
      const route = String(options.route ?? '')
      const request = options.fetch ?? (typeof fetch === 'function' ? fetch : undefined)
      if (route === '') return { ok: false, reason: 'no-route', missing: true }
      if (typeof request !== 'function') return { ok: false, reason: 'no-fetch', missing: true }
      const cap = Number(options.timeoutMs)
      const timeoutMs = Number.isFinite(cap) && cap > 0 ? cap : RELOAD_TIMEOUT_MS
      const signal = typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function'
        ? AbortSignal.timeout(timeoutMs)
        : undefined
      let timer
      try {
        const attempt = (async () => {
          const response = await request(route, {
            method: 'POST',
            headers: { 'content-type': 'application/json', accept: 'application/json' },
            body: JSON.stringify({ action: 'refresh' }),
            ...(signal === undefined ? {} : { signal }),
          })
          if (response === null || typeof response !== 'object') return { ok: false, reason: 'no-response' }
          const status = Number(response.status) || 0
          if (response.ok !== true) {
            return { ok: false, status, reason: `http-${status}`, missing: status === 404 }
          }
          let answer
          try {
            answer = await response.json()
          } catch (error) {
            return { ok: false, status, reason: 'unparsable' }
          }
          if (answer === null || typeof answer !== 'object' || answer.ok !== true) {
            return {
              ok: false,
              status,
              reason: String(answer?.reason ?? 'refused'),
              answer,
            }
          }
          return { ok: true, status, answer }
        })()
        return await Promise.race([
          attempt,
          new Promise(resolve => {
            timer = setTimeout(() => resolve({ ok: false, reason: 'timeout' }), timeoutMs)
          }),
        ])
      } catch (error) {
        return { ok: false, reason: messageOf(error) }
      } finally {
        if (timer !== undefined) clearTimeout(timer)
      }
    }

    /** What one refresh actually achieved, from the two answers. */
    function reloadSummaryOf(mcp, skills) {
      const refreshed = Array.isArray(mcp?.answer?.report?.refreshed) ? mcp.answer.report.refreshed.length : 0
      const servers = refreshed > 0
        ? refreshed
        : Array.isArray(mcp?.answer?.servers) ? mcp.answer.servers.length : 0
      const failed = Array.isArray(mcp?.answer?.report?.failed) ? mcp.answer.report.failed.length : 0
      const counts = skills?.ok === true ? skillsCounts(skills.answer) : { global: 0, workspace: 0 }
      return {
        mcpOk: mcp?.ok === true,
        skillsOk: skills?.ok === true,
        servers,
        failed,
        skills: counts.global + counts.workspace,
        mcpMissing: mcp?.missing === true,
        skillsMissing: skills?.missing === true,
        reason: String(mcp?.reason ?? skills?.reason ?? ''),
      }
    }

    /**
     * The one sentence a bare action can leave behind.
     *
     * Composed from clauses rather than a sentence per combination, so partial
     * success reads as partial success: two servers back and one still refused is
     * said out loud instead of "done".
     */
    function reloadSentence(summary, t) {
      if (summary.mcpMissing === true && summary.skillsMissing === true) return t('reloadNoService')
      const parts = [
        summary.mcpOk === true ? t('reloadMcpOk', { servers: summary.servers }) : t('reloadMcpFailed'),
        summary.skillsOk === true ? t('reloadSkillsOk', { skills: summary.skills }) : t('reloadSkillsFailed'),
      ]
      if (summary.failed > 0) parts.push(t('reloadSomeFailed', { failed: summary.failed }))
      return parts.join(' ')
    }

    /**
     * Run both refreshes in order, each guarded.
     *
     * A refusal on one route never prevents the other: a failed MCP refresh still
     * attempts skills, and a failed skills refresh still reports what MCP managed.
     * A second `/reload` while one runs is **refused** rather than joined — the
     * second caller gets a `skipped` breadcrumb and no request is sent.
     * @param options - the fetch, the cap, the clock, and the breadcrumb writer.
     */
    async function runModelReload(options = {}) {
      const write = typeof options.write === 'function' ? options.write : reloadWrite
      const clock = typeof options.now === 'function' ? options.now : Date.now
      const started = clock()
      const mcp = await postRefresh({ route: MCP_ROUTE, fetch: options.fetch, timeoutMs: options.timeoutMs })
      const skills = await postRefresh({ route: SKILLS_ROUTE, fetch: options.fetch, timeoutMs: options.timeoutMs })
      const summary = reloadSummaryOf(mcp, skills)
      const elapsedMs = Math.max(0, clock() - started)
      write({
        phase: 'ran',
        servers: summary.servers,
        failed: summary.failed,
        skills: summary.skills,
        elapsedMs,
      })
      if (summary.mcpOk !== true) write({ phase: 'failed', step: 'mcp', reason: String(mcp?.reason ?? 'failed') })
      if (summary.skillsOk !== true) write({ phase: 'failed', step: 'skills', reason: String(skills?.reason ?? 'failed') })
      return { ...summary, elapsedMs }
    }

    /**
     * The command contribution, gated on the rows it refreshes.
     *
     * Either row is enough: refreshing whichever exists beats refusing both. With
     * neither on, nothing is registered at all.
     * @param t - the dictionary.
     * @param controller - the switch snapshot.
     * @param run - the action body.
     */
    function reloadContribution(t, controller, run) {
      return {
        name: RELOAD_COMMAND_NAME,
        label: () => t('reloadLabel'),
        description: () => t('reloadDescription'),
        available: () => rowEnabled(controller.getSnapshot(), MCP_MODULE)
          || rowEnabled(controller.getSnapshot(), SKILLS_MODULE),
        ui: { kind: 'action', run },
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

    // ---------------------------------------------------------------------
    // Side chats
    //
    // `/btw` and `/side` are one errand with two spellings: fork this
    // conversation, leave it on screen, and name the fork for what it is. The
    // fork is the shipped one — no `atSeq`, so it cuts at the last completed turn
    // and the child carries everything said so far.
    //
    // A side chat is a *row*, not a view: the point is to keep talking here and
    // have the branch standing beside it, so nothing on this path navigates. The
    // sidebar's own Fork already has exactly this behaviour
    // (`uiWorkspace.forkSession`), which is what the handler calls.
    //
    // They ride the command surface rather than the composer, which means they
    // are `commandUi` contributions of kind `action`: a bare invocation runs a
    // callback and never submits a message. Two consequences decide the code
    // below. A contribution with arguments does not run at all — the input
    // machine falls through to `session.prompt`, i.e. `btw how do I …` would be
    // sent to the *current* conversation — so the copy says it takes none. And
    // `ui.run` is called without awaiting or catching, so every path here has to
    // catch for itself or a failure disappears.
    // ---------------------------------------------------------------------

    /** The spellings of the command, one contribution each. */
    const SIDE_COMMAND_NAMES = ['btw', 'side']

    /**
     * The name a side chat's row carries, unique among its siblings.
     *
     * A fork inherits its parent's titles, and `increaseTitle` numbers a child
     * inside its parent's line — but from the *source* title, so every sibling of
     * one parent is `EDH (1)`. Ours is a fixed string too, so three side chats of
     * one conversation would all read `Side: EDH`; the number is what keeps them
     * apart. The rule is the next number after the highest already in use, with a
     * bare base counting as `(1)`: no siblings is the base, one is `base (2)`,
     * and a gap is not reused (a title is a record, not a slot).
     *
     * Matching is exact, so `Side: EDH (2) notes` and `Side: EDH2` are somebody
     * else's titles: only the base itself and `base (<digits>)` count.
     * @param parentTitle - the parent's title, when the list knows one.
     * @param titles - every title the session list is showing.
     * @param t - the dictionary's translate function.
     */
    function sideTitle(parentTitle, titles, t) {
      const title = typeof parentTitle === 'string' ? parentTitle.trim() : ''
      const base = title === '' ? t('btwLabel') : t('btwTitle', { title })
      let highest = 0
      for (const candidate of Array.isArray(titles) ? titles : []) {
        if (typeof candidate !== 'string') continue
        const present = candidate.trim()
        if (present === base) {
          highest = Math.max(highest, 1)
          continue
        }
        if (!present.startsWith(`${base} (`) || !present.endsWith(')')) continue
        const digits = present.slice(base.length + 2, -1)
        if (/^\d+$/.test(digits)) highest = Math.max(highest, Number(digits))
      }
      return highest === 0 ? base : `${base} (${highest + 1})`
    }

    /**
     * Every title the Session list is showing, as plain strings.
     *
     * The same projection the parent's own title comes from. Titles alone are
     * enough: the base a side chat is named from embeds the parent's title, so a
     * sibling is recognisable without a lineage field the projection may not
     * carry. A store that refuses answers `[]` — the cost is a repeated name.
     * @param sessions - the `sessions` service.
     */
    function sessionTitles(sessions) {
      try {
        const byId = sessions?.list?.getSnapshot?.()?.byId
        if (byId === null || typeof byId !== 'object') return []
        return Object.values(byId)
          .map(row => (row !== null && typeof row === 'object' ? row.title : undefined))
          .filter(title => typeof title === 'string' && title.trim() !== '')
      } catch (error) {
        return []
      }
    }

    /**
     * The title the Session list is showing for one Session, when it is readable.
     *
     * The list projection is where the sidebar's own title comes from, and it is
     * a projection: a Session the list has not seen — or a store that refuses —
     * simply has none, which costs the nicer name and nothing else.
     * @param sessions - the `sessions` service.
     * @param session - the Session the command was invoked from.
     */
    function sessionTitle(sessions, session) {
      const sessionId = session?.sessionId
      try {
        const row = sessions?.list?.getSnapshot?.()?.byId?.[sessionId]
        if (row !== undefined && typeof row.title === 'string' && row.title.trim() !== '') return row.title.trim()
      } catch (error) {
        // Diagnostic only: fall through to the session object's own field.
      }
      const title = session?.title
      return typeof title === 'string' ? title.trim() : ''
    }

    /**
     * Open the side chat: fork this conversation, name the fork, show it beside.
     *
     * Never rejects — `ui.run` calls it un-awaited from the command registry, so
     * anything thrown here would surface as an unhandled rejection and the person
     * who typed the command would see nothing at all. Each step records its own
     * `edh:btw` breadcrumb instead.
     *
     * The view does not move: the fork is opened as a tab in the right-hand pane,
     * so this conversation stays on screen beside it. That tab is the only
     * optional step — without a right column the Session still exists and the
     * sidebar lists it, which is a usable result, just not a side-by-side one.
     *
     * The fork reports its child through `onCreated` *before* it can still throw
     * (its own inherited-title rename fails after the child exists), so the child
     * id is captured there: a chat that exists still gets named even when the
     * call that created it then failed.
     * @param options - the dictionary, the services the fork, the rename, and the
     *   pane need, and the Session the command was typed in.
     */
    async function openSideChat({ t, sessions, uiWorkspace, pane, replaceTab, session }) {
      const sessionId = session?.sessionId
      btwWrite({ phase: 'click', sessionId: String(sessionId ?? '') })
      if (typeof sessionId !== 'string' || sessionId === '') {
        btwWrite({ phase: 'failed', step: 'click', message: 'the command had no session id' })
        return
      }

      let childId
      /** The fork reports its child before it can still throw; capture it there. */
      const onCreated = id => {
        childId = id
        btwWrite({ phase: 'forked', sessionId, childId: id })
      }
      try {
        // `forkSession` is the shipped fork-in-place — the sidebar's own Fork
        // uses it: it forks with `increaseTitle` and deliberately does not
        // navigate, so the child arrives as a row beside its source while this
        // conversation stays on screen. That is the whole point of a side chat.
        if (typeof uiWorkspace?.forkSession === 'function') {
          childId = await uiWorkspace.forkSession(sessionId, onCreated)
        } else {
          // A build without that facade still gets the same result, and still
          // never navigates: nothing here may move the view.
          childId = await sessions.fork({ sessionId, increaseTitle: true, onCreated })
        }
      } catch (error) {
        if (typeof childId !== 'string' || childId === '') {
          btwWrite({ phase: 'failed', step: 'fork', message: messageOf(error) })
          return
        }
        // The child exists: the fork only failed to number it, and the rename
        // below replaces that number anyway.
        btwWrite({ phase: 'failed', step: 'fork-title', childId, message: messageOf(error) })
      }
      if (typeof childId !== 'string' || childId === '') {
        btwWrite({ phase: 'failed', step: 'fork', message: 'the fork answered no child session' })
        return
      }

      // Best effort, and last before the pane: a refused rename is recorded and
      // nothing else. A title save never fails a working side chat.
      try {
        const renamed = await renameSideChat(sessions, childId, sideTitle(sessionTitle(sessions, session), sessionTitles(sessions), t))
        btwWrite({
          phase: 'named',
          childId,
          renamed: renamed?.ok === true,
          ...(renamed?.ok === true ? {} : { reason: String(renamed?.error?.code ?? renamed?.error ?? 'unknown') }),
        })
        try {
          await sessions.refreshProjections(childId)
        } catch (error) {
          // The rename already applied the title projection; this is only the
          // list's chance to agree, so its failure is not the rename's.
        }
      } catch (error) {
        btwWrite({ phase: 'failed', step: 'name', childId, message: messageOf(error) })
      }
      // Then show it beside this conversation, in the right-hand pane. This is
      // the one step that may degrade: the fork exists and the sidebar lists it,
      // so a build without a right column, or a column that refuses the address,
      // costs the second pane and nothing else. `openResource` throws
      // synchronously for an address no tab type claims, so both shapes land in
      // the same catch.
      //
      // No placement flags. `preferNewPane` asks the dock to *split*, which put
      // the side chat in a second pane beside the launcher instead of a tab in
      // the one that was already open; leaving it out puts the tab where the
      // person already is, and the default `revealIfOpened` re-activates an
      // existing tab rather than opening the same address twice.
      try {
        if (typeof pane?.openResource !== 'function') {
          btwWrite({ phase: 'pane-failed', childId, reason: 'no-right-column' })
        } else {
          await pane.openResource(btwAddress(childId), {
            kind: BTW_TAB_KIND,
            ...(replaceTab === undefined ? {} : { replaceTab }),
          })
          btwWrite({ phase: 'pane-opened', childId })
        }
      } catch (error) {
        btwWrite({ phase: 'pane-failed', childId, message: messageOf(error) })
      }
    }

    /**
     * Name the side chat through the live Session, as the sidebar's rename does.
     *
     * The `sessions` service has **no** `rename(id, title)`: its surface is
     * `retain` / `using` / `fork` / `create` / `refreshProjections` and the rest,
     * so calling `sessions.rename(...)` throws and the fork keeps its number —
     * which is precisely how it shipped twice. The shipped rename dialog does
     * this instead, in the workspace package:
     *
     *     sessions.using(id, { source }, reference => reference.binding.session.rename(title))
     *
     * `using` retains the child (making it live), awaits the open, and the
     * binding's own `rename(title)` is the Session instance's method — the one
     * that sends the RPC and applies the title projection. That route works.
     * @param sessions - the `sessions` service.
     * @param childId - the fork's Session id.
     * @param title - the title to set.
     * @returns the rename result: the accepted title, or a failure to record.
     */
    async function renameSideChat(sessions, childId, title) {
      if (typeof sessions?.using === 'function') {
        return await sessions.using(childId, { source: BTW_RETAIN_SOURCE },
          reference => reference.binding.session.rename(title))
      }
      // A build without `using` has no route at all; saying so beats a TypeError.
      return { ok: false, error: { code: 'no-rename-route' } }
    }

    /**
     * The one way into a side chat, for both commands and the launcher card.
     *
     * `ui.run` is called un-awaited and uncatchable, so this never returns a
     * promise anything can forget to handle; the flow behind it catches for
     * itself. The optional second argument carries the card's own tab, which the
     * side chat takes the place of — a command has no tab, so it passes nothing.
     * @param t - the dictionary's translate function.
     * @param services - the `sessions` and `uiWorkspace` faces, and the holder the
     *   optional right column fills.
     */
    function createSideChatRunner(t, services) {
      return (session, options = {}) => {
        void openSideChat({
          t,
          sessions: services.sessions,
          uiWorkspace: services.uiWorkspace,
          // The holder is read per click, so a right column that mounts later
          // (or never) is honoured without re-registering anything.
          pane: services.pane?.current,
          replaceTab: options.replaceTab,
          session,
        })
      }
    }

    /**
     * The contributions for both spellings, sharing one handler.
     *
     * `available` is the row's own enablement — a plain predicate, no aggregate
     * fallback — so turning `edh-btw` off takes both rows out of the menu on the
     * spot, and a profile whose patch predates the row never offers them.
     * @param t - the dictionary's translate function.
     * @param controller - the switch controller holding the row states.
     * @param services - holds the runner; the launcher card shares this reference.
     */
    function sideCommands(t, controller, services) {
      // One handler for both names, and for the launcher card: the three doors
      // must not drift apart.
      const run = services.run
      // Each contribution states its own copy as a thunk: the menu reads `label`
      // and `description` on every candidate pass, so a locale switch lands
      // without re-registering anything.
      return SIDE_COMMAND_NAMES.map(name => ({
        name,
        label: () => t('btwLabel'),
        description: () => t('btwDescription'),
        available: () => rowEnabled(controller.getSnapshot(), BTW_MODULE),
        ui: { kind: 'action', run },
      }))
    }

    // --- the right-hand pane the side chat is shown in --------------------
    //
    // Side by side is the whole request: the parent stays on screen and the fork
    // opens in the right column, as a tab that renders a second Session's real,
    // writable conversation. That column is the only place this build can put
    // two conversations at once — the centre panel is a replace-the-centre
    // registry with no split — and the shipped subagent chat is exactly this:
    // a pane tab whose body binds a *retained* Session reference around the
    // conversation slot.
    //
    // Three pieces make that work, and each is needed:
    //   1. a resource protocol, so the tab's content is an address the registry
    //      can claim, and closing the tab releases the Session through `finally`;
    //   2. a tab type, which claims our addresses and paints the chip title;
    //   3. a keyed entry in `sidebar.right.pane.tab` that declares a
    //      session-scoped child slot, and the panel registered on that child,
    //      which renders `conversation.content` with `variant: 'embedded'`.
    // The pane body itself gets the reference from `useResource(tab.contentId)`
    // and hands it to `SessionProvider`; without that provider the child slot has
    // no Session and paints nothing.

    /** The resource protocol one side chat's tab is addressed by. */
    const BTW_PROTOCOL = 'edhbtw'
    /** Address of one side chat: `dsh-resource://edhbtw/session/<childSessionId>`. */
    const BTW_ADDRESS = `dsh-resource://${BTW_PROTOCOL}/session/`
    /** The tab type's registration id, unique across every contributing plugin. */
    const BTW_TAB_ID = 'moreweb-edh/btw'
    /** The kind both the type and `openResource` name. */
    const BTW_TAB_KIND = 'edh-btw-chat'
    /** The session-scoped child slot the pane body renders its conversation in. */
    const BTW_CHAT_SLOT = 'edh.btw.chat'
    /** The retain source, so a leaked reference is traceable to this feature. */
    const BTW_RETAIN_SOURCE = 'edhSideChat'
    /**
     * The launcher card's seat among the shipped doors: Workspace files 10, New
     * terminal 20, Browser 30. A side chat starts from the conversation you are
     * in rather than from something the column holds, so it reads last.
     */
    const BTW_GUIDE_ORDER = 40

    /**
     * The address one side chat is opened at.
     * @param childId - the fork's Session id.
     */
    function btwAddress(childId) {
      return `${BTW_ADDRESS}${encodeURIComponent(childId)}`
    }

    /**
     * The child Session one side-chat address names.
     *
     * Mirrors the shipped parser: a `dsh-resource:` URL whose host is our
     * protocol and whose path is `session/<id>`. Anything else is not ours, and
     * answering `undefined` is how a foreign address stays foreign.
     * @param value - a possible side-chat resource address.
     * @returns the child Session id, or `undefined` for another or malformed address.
     */
    function parseBtwAddress(value) {
      let url
      try {
        url = new URL(value)
      } catch (error) {
        return undefined
      }
      if (url.protocol !== 'dsh-resource:' || url.hostname.toLowerCase() !== BTW_PROTOCOL) return undefined
      const parts = url.pathname.split('/').filter(Boolean)
      if (parts.length !== 2 || parts[0] !== 'session') return undefined
      try {
        return decodeURIComponent(parts[1])
      } catch (error) {
        return undefined
      }
    }

    /** Resolve once the tab that opened this resource has gone away. */
    function btwWaitForAbort(signal) {
      if (signal.aborted) return Promise.resolve()
      return new Promise(resolve => {
        signal.addEventListener('abort', () => {
          resolve()
        }, { once: true })
      })
    }

    /**
     * The resource provider that keeps one side chat's Session alive.
     *
     * The tab body is handed whatever this yields; the reference is what carries
     * the Session's authority into the pane, so it is retained for exactly as
     * long as the tab exists and released in `finally` whatever happens.
     * @param sessions - the `sessions` service.
     */
    function btwResourceProvider(sessions) {
      return {
        protocol: BTW_PROTOCOL,
        async *open(address, { signal }) {
          const childId = parseBtwAddress(address)
          if (childId === undefined) throw new Error(`edh btw: invalid side-chat address "${address}"`)
          if (signal.aborted) return
          const reference = sessions.retain(childId, { source: BTW_RETAIN_SOURCE, signal })
          try {
            yield { ok: true, value: { childId, reference } }
            await btwWaitForAbort(signal)
          } finally {
            reference.release()
          }
        },
      }
    }

    /** Fixed chat selection used by an embedded Conversation occurrence. */
    function FixedChatConversationView(props) {
      return props.renderSlot('conversation.session', { view: 'chat' })
    }

    /**
     * The pane body: bind the retained child Session around its chat slot.
     *
     * It paints no frame of its own — the conversation package styles itself, and
     * the tab chrome belongs to the right column. With no resource (the retain
     * failed, or the tab is still settling) there is no Session to show, so it
     * renders nothing rather than an empty shell.
     */
    function BtwChatTab({ useTabInfo, useResource, SessionProvider, renderSlot }) {
      const { tab } = useTabInfo()
      const resource = useResource(tab.contentId)
      if (resource.value === undefined) return null
      return h(SessionProvider, { session: resource.value.reference },
        renderSlot(BTW_CHAT_SLOT, {}))
    }

    /**
     * The side chat's conversation: the shipped content, rendered embedded.
     *
     * `variant: 'embedded'` is what makes a second Session's writeable
     * conversation fit a pane instead of the centre, and the phase decides
     * whether the hero, the settling shell, or the live chat is shown — a fresh
     * fork is blank, so the hero with its composer comes first.
     */
    function BtwConversationPanel({ sessionId, useSession, useConversation, useSessions, renderFactorySlot }) {
      const session = useSession(value => value)
      const shellPhase = useConversation(value => value).activeTargets.size > 0 || !session.blank && !session.awaitingFirstTurn || session.running
        ? 'active'
        : session.promptAttempted ? 'engaging' : 'blank'
      const summaryBlank = useSessions(state => state.byId[sessionId]?.blank)
      const settling = shellPhase === 'blank' && session.openState === 'loading' && summaryBlank !== true
      const hero = shellPhase === 'blank' && (session.openState === 'open' || summaryBlank === true)
      return renderFactorySlot('conversation.content', {
        variant: 'embedded',
        phase: settling ? 'settling' : hero ? 'hero' : 'active',
        hero,
      }, { slots: { views: FixedChatConversationView } })
    }

    /**
     * The side chat's tab type: its addresses, its chip title, and its card in
     * the right column's launcher.
     *
     * The `guide` entry is what puts "Side chat" among the shipped doors
     * (Workspace files 10, New terminal 20, Browser 30). Ours is 40 — after
     * every shipped card, because a side chat starts from the conversation you
     * are in rather than from a thing the column holds, so it reads last.
     * @param t - the dictionary's translate function.
     * @param sessions - the `sessions` service, read for the chip title.
     */
    function sideChatTabType(t, sessions) {
      return {
        id: BTW_TAB_ID,
        kind: BTW_TAB_KIND,
        patterns: [`${BTW_ADDRESS}**`],
        priority: 'extension',
        canOpen: address => parseBtwAddress(address) !== undefined,
        // The chip reads the Session store on every pass, so the rename lands on
        // the tab without reopening it.
        title: address => {
          const childId = parseBtwAddress(address)
          if (childId === undefined) return t('btwLabel')
          try {
            const title = sessions.list.getSnapshot().byId[childId]?.title
            return typeof title === 'string' && title.trim() !== '' ? title : t('btwLabel')
          } catch (error) {
            return t('btwLabel')
          }
        },
        guide: [{
          id: 'side',
          order: BTW_GUIDE_ORDER,
          title: () => t('btwLabel'),
          description: () => t('btwGuide'),
          icon: SideGuideIcon,
        }],
      }
    }

    /**
     * The launcher card: "Side chat", drawn like the shipped doors around it.
     *
     * The shipped card is `EntryBox`, and picking one opens its type *as a page*
     * in the card's own tab. That does not fit a side chat — its tab needs a
     * child Session address that only exists after a fork — so this paints the
     * same card and runs the same flow the `/btw` command runs instead. Markup
     * and every rule mirror `GuideBody`'s `EntryBox` / `GuideBody.module.css`.
     * @param t - the dictionary's translate function.
     * @param services - holds the runner the command surface fills.
     */
    function createSideGuideEntry(t, services) {
      return function SideGuideEntry({ sessionId, useTabInfo }) {
        const tab = useTabInfo === undefined ? undefined : useTabInfo().tab
        return h('button', {
          type: 'button',
          className: 'edh-btw-guide',
          'data-sidebar-right-guide-entry': BTW_TAB_KIND,
          onClick: () => {
            btwWrite({ phase: 'guide-click', sessionId: String(sessionId ?? '') })
            const run = services?.run
            if (typeof run !== 'function') {
              // The command surface never mounted, so there is no flow to run.
              btwWrite({ phase: 'failed', step: 'guide', message: 'no side-chat runner' })
              return
            }
            // The card is a door, not a page: the side chat takes this tab's
            // place, exactly as a shipped card opens its type in its own tab.
            run({ sessionId }, { replaceTab: tab?.id })
          },
        },
          h('span', { className: 'edh-btw-guideIcon' }, icon(ICON_SIDE, 26)),
          h('span', { className: 'edh-btw-guideText' },
            h('span', { className: 'edh-btw-guideTitle' }, t('btwLabel')),
            h('span', { className: 'edh-btw-guideDescription' }, t('btwGuide'))))
      }
    }

    /**
     * Register everything the pane needs.
     *
     * Each registration has its own effect and its own `try`: a build that
     * refuses one of these seats still gets the others, and each failure is
     * recorded instead of thrown, because this runs while the plugin mounts and a
     * throw here would take the whole control surface with it. Each effect owns
     * its own disposal, so the scope going away removes them all.
     * @param t - the dictionary's translate function.
     * @param scope - the optional scope carrying the right column, its tab
     *   registry, the resource registry, and the slot registry.
     * @param controller - the switch controller holding the row states.
     * @param services - holds the runner the command surface fills.
     */
    function registerSideChatPane(t, scope, controller, services) {
      /** Run one registration and record which part refused, if any. */
      const install = (part, effect) => {
        try {
          scope.effect(effect, `edh: side chat ${part}`)
        } catch (error) {
          btwWrite({ phase: 'register-failed', part, message: messageOf(error) })
        }
      }

      install('resources', () => scope.resources.register(btwResourceProvider(scope.sessions)))
      install('styles', () => installBtwStyles())
      install('pane', () => scope.slots.inject('sidebar.right.pane.tab', () => scope.slots.register({
        name: 'sidebar.right.pane.tab',
        key: BTW_TAB_ID,
        children: { [BTW_CHAT_SLOT]: { kind: 'single', scope: 'session' } },
      }, BtwChatTab)))
      install('panel', () => scope.slots.inject(BTW_CHAT_SLOT, () => scope.slots.register({
        name: BTW_CHAT_SLOT,
      }, BtwConversationPanel)))
      install('guide', () => scope.slots.inject('sidebar.right.tab.guide.entry', () => scope.slots.register({
        name: 'sidebar.right.tab.guide.entry',
        key: BTW_TAB_ID,
      }, createSideGuideEntry(t, services))))

      // The tab type carries the launcher card, so it is the one seat that has to
      // follow the row: while `edh-btw` is off there is no card to click and no
      // address this plugin claims. It is registered from the controller's own
      // state and re-synced on every change, the same way the MCP nav cell is.
      install('tab-type', () => {
        let dispose
        let installed = false
        /** Register, dispose, or leave alone, to match the row right now. */
        const sync = () => {
          const wanted = rowEnabled(controller.getSnapshot(), BTW_MODULE)
          if (wanted === installed) return
          if (!wanted) {
            installed = false
            dispose?.()
            dispose = undefined
            return
          }
          try {
            dispose = scope.sidebarRightTabs.register(sideChatTabType(t, scope.sessions))
            installed = true
          } catch (error) {
            // This runs from the controller's own listener, so a throw would
            // surface as a failed row read and take the switch with it.
            installed = false
            btwWrite({ phase: 'register-failed', part: 'tab-type', message: messageOf(error) })
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
    }

    /**
     * The launcher card's look, copied from the shipped `GuideBody.module.css`.
     *
     * The column owns the guide's frame, so there is nothing to draw but the card
     * itself: the same 380px door, the same 26px glyph well, the same 14/11px
     * title and description. Only the class prefix is ours.
     */
    const BTW_CSS = [
      '.edh-btw-guide{box-sizing:border-box;width:380px;max-width:100%;min-height:56px;color:var(--dsw-alias-label-primary);font:inherit;text-align:left;background:var(--dsw-alias-bg-layer-1);border:.5px solid var(--dsw-alias-border-l3);border-radius:var(--dsw-radius-xl);cursor:pointer;align-items:center;gap:14px;padding:14px 20px;display:flex}',
      '.edh-btw-guide:hover{background:var(--dsw-alias-interactive-bg-hover)}',
      '.edh-btw-guideIcon{width:26px;height:26px;color:var(--dsw-alias-label-secondary);flex:none;justify-content:center;align-items:center;display:flex}',
      '.edh-btw-guideText{flex-direction:column;flex:1;gap:3px;min-width:0;display:flex}',
      '.edh-btw-guideTitle{white-space:nowrap;text-overflow:ellipsis;font-size:14px;line-height:1.4;overflow:hidden}',
      '.edh-btw-guideDescription{color:var(--dsw-alias-label-tertiary);white-space:nowrap;text-overflow:ellipsis;font-size:11px;line-height:1.4;overflow:hidden}',
    ].join('')

    /** Install the card's stylesheet once, and answer its disposer. */
    function installBtwStyles() {
      const selector = 'style[data-edh-css="btw"]'
      if (typeof document === 'undefined') return () => {}
      const existing = document.querySelector(selector)
      if (existing !== null) return () => {}
      const tag = document.createElement('style')
      tag.dataset.edhCss = 'btw'
      tag.dataset.plugin = '@moreweb/edh'
      tag.textContent = BTW_CSS
      document.head.appendChild(tag)
      return () => {
        if (tag.parentNode !== null) tag.parentNode.removeChild(tag)
      }
    }

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

      // mobile — the phone layer, in one effect and gated on its own row. It is
      // the only EDH feature that changes the document itself rather than
      // painting a slot: a viewport that opts into the notch, the web-app metas,
      // the manifest and the phone stylesheet. Remote proxies this same page, so
      // a phone inherits the layer from here; disposal puts the head back exactly
      // as it was found, which is why turning the row off needs no restart.
      installMobileLayer(ctx, controller)

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

      // remote — its own page in the Settings navigation, right after the MCP
      // one and gated the same way. The listener behind it belongs to a feature
      // row; while that row is missing or off there is no route to publish to,
      // so the cell is withdrawn instead of opening a page in front of nothing.
      const RemotePage = createRemotePage(t, controller)
      ctx.effect(() => installRemoteStyles(), 'edh: remote styles')
      ctx.slots.inject(REMOTE_SECTION_SLOT, () => {
        let dispose
        let installed = false
        /** Register, dispose, or leave alone, to match the row right now. */
        const sync = () => {
          const wanted = rowEnabled(controller.getSnapshot(), REMOTE_MODULE)
          if (wanted === installed) return
          if (!wanted) {
            installed = false
            dispose?.()
            dispose = undefined
            return
          }
          try {
            dispose = ctx.slots.register({
              name: REMOTE_SECTION_SLOT,
              id: 'remote',
              order: REMOTE_SECTION_ORDER,
              locale: NS,
              label: () => t('remoteNav'),
            }, RemotePage)
            installed = true
          } catch (error) {
            // This runs from the controller's own listener, so a throw would
            // surface as a failed row read and take the switch with it. Record
            // it and stay uninstalled: no nav cell, nothing half-mounted.
            installed = false
            remoteWrite({ phase: 'register-failed', part: 'section', message: messageOf(error) })
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

      // usage — its own page in the Settings navigation, third in the row and
      // gated the same way. The numbers behind it are counted by a feature row,
      // so the cell is withdrawn while that row is missing or off rather than
      // opening a page that can only say it has nothing.
      const UsagePage = createUsagePage(t, controller, ctx.locale)

      // notify — its own page in the Settings navigation, and the watcher that
      // fires the sound. The page is gated on the row like its neighbours; the
      // watcher subscribes to the harness's own status feed and lets it go when
      // the row is off.
      // The two optional faces the notification needs: the Session list for the
      // title, and the workspace for the click. Both live on their own optional
      // contract, so a build without them still gets the sound — a title-less,
      // unclickable notification rather than no notification at all.
      const notifyFaces = { sessions: undefined, uiWorkspace: undefined }
      ctx.inject(['sessions', 'uiWorkspace'], scope => {
        scope.effect(() => {
          notifyFaces.sessions = scope.sessions
          notifyFaces.uiWorkspace = scope.uiWorkspace
          return () => {
            notifyFaces.sessions = undefined
            notifyFaces.uiWorkspace = undefined
          }
        }, 'edh: notify faces')
      })
      const notifyChannel = installNotifier(ctx, controller, {
        t,
        title: sessionId => notifyTitleText(notifySessionTitle(notifyFaces.sessions, sessionId), t),
        openSession: sessionId => {
          const workspace = notifyFaces.uiWorkspace
          if (workspace === undefined || typeof workspace.openSession !== 'function') return undefined
          return workspace.openSession(sessionId)
        },
        focus: () => {
          if (typeof window !== 'undefined' && typeof window.focus === 'function') window.focus()
        },
        // Clicking the popup asks the Host to bring the window forward: a
        // renderer cannot raise its own OS window, and a minimised one cannot.
        raise: () => raiseNotifyWindow({ timeoutMs: NOTIFY_RAISE_TIMEOUT_MS }),
        // The body: one bounded Host read at fire time, with its own abort at the
        // same cap the engine races. It never throws; an empty answer becomes the
        // plain sentence.
        readText: sessionId => readNotifyLast(sessionId, { timeoutMs: NOTIFY_TEXT_TIMEOUT_MS }),
      })
      const NotifyPage = createNotifyPage(t, controller, notifyChannel)
      ctx.effect(() => installNotifyStyles(), 'edh: notify styles')
      // search — the command palette.
      //
      // The inline search cannot be removed: it is a private renderer inside the
      // one occupant of `sidebar.workspaces` (a single slot holding the whole
      // browsing region — header, search, session list, workspace dialogs), so
      // shadowing it would mean reimplementing the session list. This adds a
      // button beside Settings and a shortcut instead, and says so.
      const searchFaces = { sessions: undefined, uiWorkspace: undefined, layout: undefined, shortcuts: undefined, fetch: undefined }
      ctx.inject(['sessions', 'uiWorkspace', 'layout'], scope => {
        scope.effect(() => {
          searchFaces.sessions = scope.sessions
          searchFaces.uiWorkspace = scope.uiWorkspace
          searchFaces.layout = scope.layout
          return () => {
            searchFaces.sessions = undefined
            searchFaces.uiWorkspace = undefined
            searchFaces.layout = undefined
          }
        }, 'edh: search faces')
      })
      ctx.inject(['shortcuts'], scope => {
        scope.effect(() => {
          searchFaces.shortcuts = scope.shortcuts
          return () => {
            searchFaces.shortcuts = undefined
          }
        }, 'edh: search shortcuts')
      })
      const paletteBus = createPaletteBus()
      const SearchPalette = createSearchPalette(t, paletteBus, searchFaces)
      const SearchButton = createSearchButton(t, paletteBus)
      ctx.effect(() => installSearchStyles(), 'edh: search styles')
      // The sidebar's own magnifier is the primary door: one delegated capture
      // listener turns it into this palette instead of the shipped inline search.
      ctx.effect(() => installSearchTriggerGuard({ open: () => paletteBus.open('magnifier') }), 'edh: search trigger guard')

      /** Register one palette part, and keep it in step with its row. */
      const registerPalettePart = (slot, id, order, Component, label) => () => {
        let dispose
        let installed = false
        const sync = () => {
          const wanted = rowEnabled(controller.getSnapshot(), SEARCH_MODULE)
          if (wanted === installed) return
          if (!wanted) {
            installed = false
            dispose?.()
            dispose = undefined
            return
          }
          try {
            dispose = ctx.slots.register({ name: slot, id, order, locale: NS, label: label ?? (() => t('searchOpen')) }, Component)
            installed = true
          } catch (error) {
            installed = false
            searchWrite({ phase: 'register-failed', part: slot, message: messageOf(error) })
          }
        }
        const stop = controller.subscribe(sync)
        sync()
        return () => {
          stop()
          dispose?.()
          dispose = undefined
        }
      }
      ctx.slots.inject(SEARCH_OVERLAY_SLOT, registerPalettePart(SEARCH_OVERLAY_SLOT, SEARCH_ID, 5, SearchPalette))
      ctx.slots.inject(SEARCH_BUTTON_SLOT, registerPalettePart(SEARCH_BUTTON_SLOT, SEARCH_BUTTON_ID, 20, SearchButton))

      // The shortcut belongs in the harness's own registry, where it shows up
      // beside every other one; a refused default falls back to a plain listener.
      ctx.inject(['shortcuts'], scope => {
        try {
          scope.effect(() => scope.shortcuts.register({
            id: 'edh.search.open',
            label: () => t('searchOpen'),
            aliases: ['search', 'palette', 'find'],
            defaults: {
              'desktop:macos': { code: 'KeyK', modifiers: ['primary'] },
              'desktop:windows': { code: 'KeyK', modifiers: ['primary'] },
              'desktop:linux': { code: 'KeyK', modifiers: ['primary'] },
              'web:macos': { code: 'KeyK', modifiers: ['primary', 'alt'] },
              'web:windows': { code: 'KeyK', modifiers: ['primary', 'alt'] },
              'web:linux': { code: 'KeyK', modifiers: ['primary', 'alt'] },
            },
            regions: ['page', 'editable', 'terminal'],
            resolve: () => ({ status: 'handled', run: () => paletteBus.open('shortcut') }),
          }), 'edh: search shortcut')
        } catch (error) {
          searchWrite({ phase: 'failed', action: 'shortcut', reason: messageOf(error) })
        }
      })


      // skills — its own Settings page with two tabs.
      //
      // A Settings page sits outside a session scope, so `uiSession.current` is
      // often undefined here; `uiSession` therefore joins on its own optional
      // contract rather than the required list, and the page falls back to the
      // most recent conversation and then to the Host's default workspace.
      const skillsFaces = { sessions: undefined, uiSession: undefined, fetch: undefined }
      ctx.inject(['sessions'], scope => {
        scope.effect(() => {
          skillsFaces.sessions = scope.sessions
          return () => {
            skillsFaces.sessions = undefined
          }
        }, 'edh: skills sessions')
      })
      ctx.inject(['uiSession'], scope => {
        scope.effect(() => {
          skillsFaces.uiSession = scope.uiSession
          return () => {
            skillsFaces.uiSession = undefined
          }
        }, 'edh: skills ui-session')
      })
      const SkillsPage = createSkillsPage(t, skillsFaces)
      ctx.effect(() => installSkillStyles(), 'edh: skills styles')
      ctx.slots.inject(SKILLS_SECTION_SLOT, () => {
        let dispose
        let installed = false
        const sync = () => {
          const wanted = rowEnabled(controller.getSnapshot(), SKILLS_MODULE)
          if (wanted === installed) return
          if (!wanted) {
            installed = false
            dispose?.()
            dispose = undefined
            return
          }
          try {
            dispose = ctx.slots.register({
              name: SKILLS_SECTION_SLOT,
              id: 'skills',
              order: SKILLS_SECTION_ORDER,
              locale: NS,
              label: () => t('skillsNav'),
            }, SkillsPage)
            installed = true
          } catch (error) {
            installed = false
            skillsWrite({ phase: 'register-failed', part: 'section', message: messageOf(error) })
          }
        }
        const stop = controller.subscribe(sync)
        sync()
        return () => {
          stop()
          dispose?.()
          dispose = undefined
        }
      })
      // The fallback that also makes the palette work in a plain browser: the
      // registry consumes the gesture it handles, so this sees `defaultPrevented`
      // and stays out of the way.
      ctx.effect(() => {
        if (typeof window === 'undefined' || typeof window.addEventListener !== 'function') return () => {}
        const onKeyDown = event => {
          // The Harness's own `session.search` command already claims KeyK with
          // the primary modifier and consumes the gesture from a capture-phase
          // listener on `window` — which nothing below it can pre-empt. So this
          // deliberately ignores `defaultPrevented`: the palette opens anyway,
          // on top of whatever the shipped inline field did underneath.
          const intent = {
            key: event?.key,
            ctrlKey: event?.ctrlKey,
            metaKey: event?.metaKey,
            altKey: event?.altKey,
            defaultPrevented: false,
          }
          if (!searchShortcutIntent(intent)) return
          if (typeof event.preventDefault === 'function') event.preventDefault()
          paletteBus.toggle('keyboard')
        }
        window.addEventListener('keydown', onKeyDown)
        return () => {
          try {
            window.removeEventListener('keydown', onKeyDown)
          } catch (error) {
            // A window already torn down has nothing to detach.
          }
        }
      }, 'edh: search shortcut fallback')
      ctx.slots.inject(NOTIFY_SECTION_SLOT, () => {
        let dispose
        let installed = false
        /** Register, dispose, or leave alone, to match the row right now. */
        const sync = () => {
          const wanted = rowEnabled(controller.getSnapshot(), NOTIFY_MODULE)
          if (wanted === installed) return
          if (!wanted) {
            installed = false
            dispose?.()
            dispose = undefined
            return
          }
          try {
            dispose = ctx.slots.register({
              name: NOTIFY_SECTION_SLOT,
              id: 'notify',
              order: NOTIFY_SECTION_ORDER,
              locale: NS,
              label: () => t('notifyNav'),
            }, NotifyPage)
            installed = true
          } catch (error) {
            installed = false
            notifyWrite({ phase: 'register-failed', part: 'section', message: messageOf(error) })
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


      ctx.effect(() => installUsageStyles(), 'edh: usage styles')
      ctx.slots.inject(USAGE_SECTION_SLOT, () => {
        let dispose
        let installed = false
        /** Register, dispose, or leave alone, to match the row right now. */
        const sync = () => {
          const wanted = rowEnabled(controller.getSnapshot(), USAGE_MODULE)
          if (wanted === installed) return
          if (!wanted) {
            installed = false
            dispose?.()
            dispose = undefined
            return
          }
          try {
            dispose = ctx.slots.register({
              name: USAGE_SECTION_SLOT,
              id: 'usage',
              order: USAGE_SECTION_ORDER,
              locale: NS,
              label: () => t('usageNav'),
            }, UsagePage)
            installed = true
          } catch (error) {
            // This runs from the controller's own listener, so a throw would
            // surface as a failed row read and take the switch with it. Record
            // it and stay uninstalled: no nav cell, nothing half-mounted.
            installed = false
            usageWrite({ phase: 'register-failed', part: 'section', message: messageOf(error) })
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

      // btw — /btw and /side open a side chat: a fork of this conversation, shown
      // beside it in the right-hand pane, with the view never leaving this chat.
      // They are command contributions, not slots: the slash menu asks
      // `commandUi` for them, and a contribution is bare-token only (with
      // arguments the line falls through to the current Session's prompt).
      // Registering them client-side is the whole feature — a Host `/btw` would
      // collide, and a collision throws while the menu is being built, taking
      // every other command down with it.
      //
      // The right column is optional and reached separately, through the holder
      // below: if this build has no such column the commands still exist and the
      // fork still happens, because a missing pane must not cost the chat.
      //
      // Both disposers ride one effect so turning the row off, or unloading this
      // scope, removes both names together.
      /** Filled by the optional right-column scope; absent when the build has none. */
      const sidePane = { current: undefined }
      /** Filled here: the single flow both commands and the launcher card run. */
      const sideChat = { run: undefined }
      // /reload — refresh the MCP servers and the skill catalog the model sees.
      // It registers only while at least one of those rows is on: refreshing
      // whichever exists beats refusing both, and with neither on there is
      // nothing to refresh.
      ctx.inject(['commandUi'], scope => {
        let dispose
        let installed = false
        let running = false
        const runCommand = async () => {
          if (running) {
            // Refused rather than joined: a second invocation is told so, and
            // sends nothing.
            reloadWrite({ phase: 'skipped', reason: 'running' })
            return
          }
          running = true
          try {
            const summary = await runModelReload({})
            reloadWrite({ phase: 'said', text: reloadSentence(summary, t) })
          } catch (error) {
            // ui.run is un-awaited and uncatchable: this path catches itself.
            reloadWrite({ phase: 'failed', step: 'command', reason: messageOf(error) })
          } finally {
            running = false
          }
        }
        const sync = () => {
          const wanted = rowEnabled(controller.getSnapshot(), MCP_MODULE)
            || rowEnabled(controller.getSnapshot(), SKILLS_MODULE)
          if (wanted === installed) return
          if (!wanted) {
            installed = false
            dispose?.()
            dispose = undefined
            return
          }
          try {
            dispose = scope.commandUi.register(reloadContribution(t, controller, runCommand))
            installed = true
          } catch (error) {
            installed = false
            reloadWrite({ phase: 'register-failed', part: 'command', message: messageOf(error) })
          }
        }
        const stop = controller.subscribe(sync)
        sync()
        return () => {
          stop()
          dispose?.()
          dispose = undefined
        }
      })

      ctx.inject(['commandUi', 'sessions', 'uiWorkspace'], scope => {
        scope.effect(() => {
          sideChat.run = createSideChatRunner(t, {
            sessions: scope.sessions,
            uiWorkspace: scope.uiWorkspace,
            pane: sidePane,
          })
          const contributions = sideCommands(t, controller, { run: sideChat.run })
          const disposers = []
          try {
            for (const contribution of contributions) disposers.push(scope.commandUi.register(contribution))
          } catch (error) {
            // Half a pair is worse than none: a duplicate name, or a registry
            // that refuses, leaves nothing listed.
            btwWrite({ phase: 'register-failed', message: String(error?.message ?? error) })
            for (const dispose of disposers) dispose()
          }
          return () => {
            for (const dispose of disposers) dispose()
            sideChat.run = undefined
          }
        }, 'edh: side chat commands')
      })

      // btw — the right-hand pane the side chat is shown in. Its own optional
      // scope: the right column, its tab registry, and the resource registry are
      // a separate package's contracts, and a build without them must still have
      // `/btw`. Everything registered here is recorded, never thrown, and the
      // service itself is published through the holder for the handler to read at
      // click time — which is also how a build without a right column reports
      // `pane-failed` instead of failing the fork.
      ctx.inject(['sidebarRight', 'sidebarRightTabs', 'resources', 'sessions', 'slots'], scope => {
        try {
          scope.effect(() => {
            sidePane.current = scope.sidebarRight
            return () => {
              sidePane.current = undefined
            }
          }, 'edh: side chat pane')
        } catch (error) {
          btwWrite({ phase: 'register-failed', part: 'pane-face', message: String(error?.message ?? error) })
        }
        registerSideChatPane(t, scope, controller, sideChat)
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
      mcpReloadLabel,
      mcpReloadDisabled,
      adoptMcpReload,
      runMcpReload,
      postRefresh,
      reloadSummaryOf,
      reloadSentence,
      runModelReload,
      reloadContribution,
      RELOAD_COMMAND_NAME,
      RELOAD_DEBUG_KEY,
      RELOAD_TIMEOUT_MS,
      RELOAD_TAKEN_NAMES,
      hostStaleness,
      reloadOutcome,
      reloadText,
      runReload,
      icon,
      controlStyle,
      ICON_UPDATE,
      ICON_RELOAD,
      sideCommands,
      sideTitle,
      sessionTitles,
      sessionTitle,
      openSideChat,
      renameSideChat,
      createSideChatRunner,
      sideChatTabType,
      createSideGuideEntry,
      installBtwStyles,
      BTW_CSS,
      SideGuideIcon,
      ICON_SIDE,
      BTW_GUIDE_ORDER,
      SIDE_COMMAND_NAMES,
      registerSideChatPane,
      btwAddress,
      parseBtwAddress,
      btwResourceProvider,
      BtwChatTab,
      BtwConversationPanel,
      BTW_PROTOCOL,
      BTW_ADDRESS,
      BTW_TAB_ID,
      BTW_TAB_KIND,
      BTW_CHAT_SLOT,
      BTW_RETAIN_SOURCE,
      remoteView,
      remoteReport,
      readRemoteView,
      remoteMissing,
      remoteState,
      remoteStateLabel,
      remoteStateTone,
      portCheck,
      remoteDraft,
      validateRemoteDraft,
      toggleBody,
      remoteActionBody,
      remoteRefusal,
      addressLine,
      remoteAddressLines,
      warningLines,
      sessionsText,
      remotePage,
      createRemotePage,
      installRemoteStyles,
      REMOTE_CSS,
      REMOTE_ROUTE,
      REMOTE_MODULE,
      REMOTE_SECTION_SLOT,
      REMOTE_SECTION_ORDER,
      REMOTE_ACTIONS,
      REMOTE_DEFAULT_PORT,
      REMOTE_PORT_MIN,
      REMOTE_PORT_MAX,
      REMOTE_DEBUG_KEY,
      notifyDefaults,
      notifyClampVolume,
      notifyIsTone,
      notifyDomId,
      readNotifySettings,
      writeNotifySettings,
      notifyCatalog,
      notifyTransition,
      notifyAllows,
      notifySoundFor,
      createNotifyAudio,
      createNotifyPopup,
      createNotifier,
      installNotifier,
      runNotifyTest,
      notifyClampText,
      notifyTitleText,
      notifyBodyText,
      runNotifyText,
      notifySessionTitle,
      notifyOpenSession,
      readNotifyLast,
      raiseNotifyWindow,
      createPaletteBus,
      createSearchRunner,
      createAskRunner,
      searchAskCandidates,
      searchAskFailure,
      searchFirstMessageIndex,
      openSessionRow,
      SEARCH_ASK_ROUTE,
      SEARCH_ASK_LIMIT,
      SEARCH_ASK_TIMEOUT_MS,
      createSearchPalette,
      createSearchButton,
      searchPaletteView,
      searchRowsFor,
      searchActionRows,
      searchSessionRows,
      searchMessageRows,
      searchSegments,
      searchMatchAt,
      searchRelativeTime,
      searchMoveIndex,
      searchShortcutIntent,
      searchInitialState,
      searchIndexedNote,
      searchTriggerOf,
      installSearchTriggerGuard,
      SEARCH_TRIGGER_LABELS,
      createSkillsPage,
      skillsView,
      skillsScopeOf,
      skillsUrl,
      skillsRowOf,
      skillsLists,
      skillsCounts,
      skillsVisible,
      skillsNextTab,
      skillsScopeLine,
      skillsEmptyText,
      skillsReduce,
      skillsRowView,
      installSkillStyles,
      SKILLS_CSS,
      SKILLS_MODULE,
      SKILLS_SECTION_SLOT,
      SKILLS_SECTION_ORDER,
      SKILLS_TABS,
      SKILLS_ROUTE,
      SKILLS_DEBUG_KEY,
      runSearchAction,
      installSearchStyles,
      SEARCH_CSS,
      SEARCH_MODULE,
      SEARCH_ROUTE,
      SEARCH_DEBUG_KEY,
      SEARCH_OVERLAY_SLOT,
      SEARCH_BUTTON_SLOT,
      SEARCH_ID,
      SEARCH_BUTTON_ID,
      SEARCH_DEBOUNCE_MS,
      SEARCH_LIMIT,
      NOTIFY_RAISE_ROUTE,
      NOTIFY_RAISE_TIMEOUT_MS,
      NOTIFY_LAST_ROUTE,
      NOTIFY_TITLE_MAX,
      NOTIFY_BODY_MAX,
      NOTIFY_TEXT_TIMEOUT_MS,
      notifyPage,
      createNotifyPage,
      installNotifyStyles,
      NOTIFY_TONES,
      NOTIFY_CSS,
      NOTIFY_MODULE,
      NOTIFY_SECTION_SLOT,
      NOTIFY_SECTION_ORDER,
      NOTIFY_SETTINGS_KEY,
      NOTIFY_DEBUG_KEY,
      NOTIFY_SOUNDS_ROUTE,
      NOTIFY_SOUND_ROUTE,
      createMobileLayer,
      installMobileLayer,
      MOBILE_MODULE,
      MOBILE_CSS,
      MOBILE_VIEWPORT,
      MOBILE_MANIFEST,
      MOBILE_TOUCH_ICON,
      MOBILE_WORKER,
      MOBILE_WORKER_SCOPE,
      MOBILE_WORKER_STATE,
      registerMobileWorker,
      MOBILE_QUERY,
      MOBILE_THEME,
      MOBILE_META,
      MOBILE_DEBUG_KEY,
      remoteQrModel,
      remoteQrSvg,
      qrBytes,
      qrVersionFor,
      qrDataCodewords,
      qrTotalCodewords,
      qrPayloadCodewords,
      qrCodewords,
      qrFormatBits,
      qrVersionBits,
      qrPenalty,
      qrGenerator,
      qrMultiply,
      REMOTE_QR_VERSIONS,
      REMOTE_QR_ALIGNMENT,
      REMOTE_QR_QUIET,
      usageTotals,
      usageModel,
      usageDay,
      usageStamp,
      usageScopes,
      usageView,
      usageReport,
      readUsageView,
      usageMissing,
      usageEmpty,
      usageScope,
      parseDay,
      isoDay,
      weekStart,
      finishBucket,
      usageBuckets,
      usagePalette,
      usageSeries,
      usageUnits,
      formatTokens,
      formatPercent,
      formatDuration,
      usageDaysText,
      usageScale,
      usageGeometry,
      usagePoints,
      usagePath,
      usageDot,
      donutSlices,
      usageFooter,
      usagePage,
      createUsagePage,
      installUsageStyles,
      requestUsage,
      USAGE_CSS,
      USAGE_ROUTE,
      USAGE_MODULE,
      USAGE_SECTION_SLOT,
      USAGE_SECTION_ORDER,
      USAGE_ACTIONS,
      USAGE_RANGES,
      USAGE_SCOPES,
      USAGE_SERIES_MAX,
      USAGE_PALETTE,
      USAGE_NEUTRAL,
      USAGE_CHART,
      USAGE_DONUT,
      USAGE_OTHER,
      USAGE_DEBUG_KEY,
      // The two dictionaries, so a suite can prove they are symmetric.
      en,
      zh,
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
      BTW_DEBUG_KEY,
      BTW_MODULE,
    }

    return exports
  },
})
