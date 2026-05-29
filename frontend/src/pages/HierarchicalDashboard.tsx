import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  Chip,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Badge,
  Tabs,
  Tab,
  Alert,
  Snackbar,
  Tooltip,
  LinearProgress,
} from '@mui/material';
import {
  AccountTree as TreeIcon,
  Computer as AgentIcon,
  Visibility as MonitorIcon,
  Handyman as InterventionIcon,
  Notifications as AlertIcon,
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  Stop as StopIcon,
  Refresh as RefreshIcon,
  AutoMode as AutoIcon,
  SupportAgent as AdvisoryIcon,
  TouchApp as ManualIcon,
  Circle as StatusIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  CheckCircle as SuccessIcon,
  Router as CoordinatorIcon,
} from '@mui/icons-material';

// ═══════════════════════════════════════════════════════════════════════════════
// Hierarchical Monitor Dashboard — 分层监控仪表盘
// ═══════════════════════════════════════════════════════════════════════════════

interface CoordinatorNode {
  id: string;
  name: string;
  level: 0 | 1 | 2;
  state: 'AUTONOMY' | 'ADVISORY' | 'MANUAL';
  health: 'healthy' | 'degraded' | 'unhealthy';
  metrics: {
    tasksCompleted: number;
    tasksFailed: number;
    tasksPending: number;
    queueDepth: number;
  };
  children: string[];
}

interface AgentNode {
  id: string;
  name: string;
  coordinatorId: string;
  status: 'idle' | 'busy' | 'paused' | 'offline' | 'degraded';
  currentTask?: { description: string; progress: number };
  performance: { successRate: number; totalTasks: number };
}

interface AlertItem {
  id: string;
  level: 'info' | 'warning' | 'critical';
  source: string;
  message: string;
  timestamp: number;
  acknowledged: boolean;
}

interface PendingApproval {
  id: string;
  coordinatorId: string;
  description: string;
  requestedAt: number;
}

export default function HierarchicalDashboard() {
  const [activeTab, setActiveTab] = useState(0);
  const [treeData, setTreeData] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [approvals, setApprovals] = useState<PendingApproval[]>([]);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [interventionDialog, setInterventionDialog] = useState(false);
  const [interventionType, setInterventionType] = useState('STATE_CHANGE');
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false, message: '', severity: 'success',
  });
  const [wsConnected, setWsConnected] = useState(false);

  // WebSocket connection
  useEffect(() => {
    const ws = new WebSocket(`ws://${window.location.host}/ws/hierarchical`);
    
    ws.onopen = () => setWsConnected(true);
    ws.onclose = () => setWsConnected(false);
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      handleWsMessage(data);
    };

    return () => ws.close();
  }, []);

  // Polling fallback
  useEffect(() => {
    const interval = setInterval(fetchData, 3000);
    fetchData();
    return () => clearInterval(interval);
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const [treeRes, statsRes, alertsRes, approvalsRes] = await Promise.all([
        fetch('/api/hierarchical/tree'),
        fetch('/api/hierarchical/stats'),
        fetch('/api/hierarchical/alerts?acknowledged=false'),
        fetch('/api/hierarchical/approvals'),
      ]);

      if (treeRes.ok) setTreeData((await treeRes.json()).data);
      if (statsRes.ok) setStats((await statsRes.json()).data);
      if (alertsRes.ok) setAlerts((await alertsRes.json()).data);
      if (approvalsRes.ok) setApprovals((await approvalsRes.ok) ? (await approvalsRes.json()).data : []);
    } catch (err) {
      console.error('Fetch error:', err);
    }
  }, []);

  const handleWsMessage = (data: any) => {
    switch (data.type) {
      case 'coordinator.updated':
        fetchData();
        break;
      case 'alert':
        setSnackbar({ open: true, message: data.data.message, severity: data.data.level === 'critical' ? 'error' : 'warning' });
        break;
      case 'approval.added':
        setApprovals(prev => [...prev, data.data]);
        setSnackbar({ open: true, message: 'New approval request', severity: 'success' });
        break;
    }
  };

  // ── 状态颜色 ──────────────────────────────────────────
  const stateColors: Record<string, string> = {
    AUTONOMY: '#4caf50',
    ADVISORY: '#ff9800',
    MANUAL: '#2196f3',
  };

  const healthColors: Record<string, string> = {
    healthy: '#4caf50',
    degraded: '#ff9800',
    unhealthy: '#f44336',
  };

  const agentStatusColors: Record<string, string> = {
    idle: '#9e9e9e',
    busy: '#4caf50',
    paused: '#ff9800',
    offline: '#f44336',
    degraded: '#ff5722',
  };

  // ── 干预操作 ──────────────────────────────────────────
  const handleIntervention = async (targetId: string, type: string, payload: any) => {
    try {
      const res = await fetch('/api/hierarchical/intervene', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          target: { coordinatorId: targetId },
          payload,
          reason: `Manual intervention from dashboard`,
        }),
      });

      if (res.ok) {
        setSnackbar({ open: true, message: 'Intervention submitted', severity: 'success' });
        fetchData();
      } else {
        setSnackbar({ open: true, message: 'Intervention failed', severity: 'error' });
      }
    } catch (err) {
      setSnackbar({ open: true, message: 'Network error', severity: 'error' });
    }
  };

  const handleStateChange = (id: string, newState: string) => {
    handleIntervention(id, 'STATE_CHANGE', { newState });
  };

  const handleEmergencyStop = (id: string) => {
    handleIntervention(id, 'EMERGENCY_STOP', {});
  };

  const handleApproval = async (id: string, approved: boolean) => {
    try {
      await fetch(`/api/hierarchical/approvals/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved }),
      });
      setSnackbar({ open: true, message: approved ? 'Approved' : 'Rejected', severity: 'success' });
      fetchData();
    } catch {
      setSnackbar({ open: true, message: 'Approval failed', severity: 'error' });
    }
  };

  // ── 渲染分层树 ──────────────────────────────────────────
  const renderTree = (node: any, depth: number = 0) => {
    if (!node) return null;

    const isMeta = node.level === 0;
    const isGroup = node.level === 1;
    const isSubGroup = node.level === 2;

    return (
      <Box key={node.id} sx={{ ml: depth * 3 }}>
        <Card
          variant="outlined"
          sx={{
            mb: 1,
            borderLeft: `4px solid ${stateColors[node.state]}`,
            bgcolor: selectedNode === node.id ? 'action.hover' : 'background.paper',
            cursor: 'pointer',
            transition: 'all 0.2s',
            '&:hover': { bgcolor: 'action.hover' },
          }}
          onClick={() => setSelectedNode(selectedNode === node.id ? null : node.id)}
        >
          <CardContent sx={{ py: 1, '&:last-child': { pb: 1 } }}>
            <Box display="flex" alignItems="center" gap={1}>
              <CoordinatorIcon sx={{ color: stateColors[node.state] }} />
              <Box flex={1}>
                <Typography variant="subtitle2" fontWeight="bold">
                  {node.name}
                  <Chip
                    size="small"
                    label={node.state}
                    sx={{
                      ml: 1,
                      bgcolor: stateColors[node.state],
                      color: 'white',
                      fontSize: '0.7rem',
                      height: 20,
                    }}
                  />
                  <Chip
                    size="small"
                    label={node.health}
                    sx={{
                      ml: 0.5,
                      bgcolor: healthColors[node.health],
                      color: 'white',
                      fontSize: '0.7rem',
                      height: 20,
                    }}
                  />
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {isMeta ? 'Meta Orchestrator' : isGroup ? 'Group Coordinator' : 'SubGroup Coordinator'}
                  {' '}
                  | Tasks: {node.metrics?.tasksCompleted || 0}/{node.metrics?.tasksFailed || 0}/{node.metrics?.tasksPending || 0}
                  {' '}
                  | Queue: {node.metrics?.queueDepth || 0}
                </Typography>
              </Box>

              <Box display="flex" gap={0.5}>
                <Tooltip title="Autonomy">
                  <IconButton
                    size="small"
                    onClick={(e) => { e.stopPropagation(); handleStateChange(node.id, 'AUTONOMY'); }}
                    sx={{ color: node.state === 'AUTONOMY' ? stateColors.AUTONOMY : 'inherit' }}
                  >
                    <AutoIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Advisory">
                  <IconButton
                    size="small"
                    onClick={(e) => { e.stopPropagation(); handleStateChange(node.id, 'ADVISORY'); }}
                    sx={{ color: node.state === 'ADVISORY' ? stateColors.ADVISORY : 'inherit' }}
                  >
                    <AdvisoryIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Manual">
                  <IconButton
                    size="small"
                    onClick={(e) => { e.stopPropagation(); handleStateChange(node.id, 'MANUAL'); }}
                    sx={{ color: node.state === 'MANUAL' ? stateColors.MANUAL : 'inherit' }}
                  >
                    <ManualIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Emergency Stop">
                  <IconButton
                    size="small"
                    color="error"
                    onClick={(e) => { e.stopPropagation(); handleEmergencyStop(node.id); }}
                  >
                    <StopIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>
          </CardContent>
        </Card>

        {/* Children */}
        {node.children?.map((childId: string) => {
          const child = treeData?.coordinators?.[childId] || treeData?.agents?.find((a: any) => a.id === childId);
          if (!child) return null;
          return renderTree(child, depth + 1);
        })}
      </Box>
    );
  };

  // ── 主渲染 ──────────────────────────────────────────
  return (
    <Box sx={{ p: 2, maxWidth: 1400, mx: 'auto' }}>
      {/* Header */}
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
        <Box display="flex" alignItems="center" gap={1}>
          <TreeIcon sx={{ color: 'primary.main', fontSize: 32 }} />
          <Typography variant="h5" fontWeight="bold">
            Hierarchical Orchestration Monitor
          </Typography>
          <Chip
            size="small"
            label={wsConnected ? 'Live' : 'Polling'}
            color={wsConnected ? 'success' : 'warning'}
            sx={{ ml: 1 }}
          />
        </Box>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={fetchData}
          size="small"
        >
          Refresh
        </Button>
      </Box>

      {/* Stats Cards */}
      {stats && (
        <Grid container spacing={2} mb={2}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography variant="caption" color="text.secondary">Coordinators</Typography>
                <Typography variant="h4">{stats?.coordinators?.total || 0}</Typography>
                <Box display="flex" gap={0.5} mt={0.5}>
                  <Chip size="small" label={`A:${stats?.coordinators?.byState?.autonomy || 0}`} sx={{ bgcolor: stateColors.AUTONOMY, color: 'white' }} />
                  <Chip size="small" label={`V:${stats?.coordinators?.byState?.advisory || 0}`} sx={{ bgcolor: stateColors.ADVISORY, color: 'white' }} />
                  <Chip size="small" label={`M:${stats?.coordinators?.byState?.manual || 0}`} sx={{ bgcolor: stateColors.MANUAL, color: 'white' }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography variant="caption" color="text.secondary">Agents</Typography>
                <Typography variant="h4">{stats?.agents?.total || 0}</Typography>
                <Box display="flex" gap={0.5} mt={0.5}>
                  <Chip size="small" label={`Busy:${stats?.agents?.byStatus?.busy || 0}`} color="success" />
                  <Chip size="small" label={`Idle:${stats?.agents?.byStatus?.idle || 0}`} />
                  <Chip size="small" label={`Off:${stats?.agents?.byStatus?.offline || 0}`} color="error" />
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography variant="caption" color="text.secondary">Pending Approvals</Typography>
                <Typography variant="h4" color={approvals.length > 0 ? 'warning.main' : 'inherit'}>
                  {approvals.length}
                </Typography>
                <Typography variant="caption">
                  {approvals.length > 0 ? 'Awaiting human confirmation' : 'All clear'}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography variant="caption" color="text.secondary">Active Alerts</Typography>
                <Typography variant="h4" color={stats?.alerts?.unacknowledged > 0 ? 'error.main' : 'inherit'}>
                  {stats?.alerts?.unacknowledged || 0}
                </Typography>
                <Box display="flex" gap={0.5} mt={0.5}>
                  <Chip size="small" label={`Crit:${stats?.alerts?.critical || 0}`} color="error" />
                  <Chip size="small" label={`Warn:${stats?.alerts?.warning || 0}`} color="warning" />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Tabs */}
      <Paper sx={{ mb: 2 }}>
        <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)}>
          <Tab icon={<TreeIcon />} label={`Tree`} />
          <Tab icon={<CoordinatorIcon />} label={`Coordinators`} />
          <Tab icon={<AgentIcon />} label={`Agents`} />
          <Tab
            icon={
              <Badge badgeContent={approvals.length} color="warning">
                <InterventionIcon />
              </Badge>
            }
            label="Approvals"
          />
          <Tab
            icon={
              <Badge badgeContent={alerts.filter(a => !a.acknowledged).length} color="error">
                <AlertIcon />
              </Badge>
            }
            label="Alerts"
          />
        </Tabs>
      </Paper>

      {/* Tab Content */}
      <Box sx={{ minHeight: 400 }}>
        {/* Tree View */}
        {activeTab === 0 && treeData && (
          <Box>{renderTree(treeData.meta)}</Box>
        )}

        {/* Coordinators List */}
        {activeTab === 1 && (
          <List>
            {treeData?.groups?.map((group: any) => (
              <React.Fragment key={group.coordinator.id}>
                <ListItem sx={{ bgcolor: 'action.hover' }}>
                  <ListItemIcon><CoordinatorIcon color="primary" /></ListItemIcon>
                  <ListItemText
                    primary={
                      <Box display="flex" alignItems="center" gap={1}>
                        {group.coordinator.name}
                        <Chip size="small" label={group.coordinator.state} sx={{ bgcolor: stateColors[group.coordinator.state], color: 'white' }} />
                      </Box>
                    }
                    secondary={`Level ${group.coordinator.level} | ${group.subGroups?.length || 0} subgroups`}
                  />
                </ListItem>
                {group.subGroups?.map((sub: any) => (
                  <ListItem key={sub.coordinator.id} sx={{ pl: 4 }}>
                    <ListItemIcon><AgentIcon /></ListItemIcon>
                    <ListItemText
                      primary={
                        <Box display="flex" alignItems="center" gap={1}>
                          {sub.coordinator.name}
                          <Chip size="small" label={sub.coordinator.state} sx={{ bgcolor: stateColors[sub.coordinator.state], color: 'white' }} />
                          <Typography variant="caption">{sub.agents?.length || 0} agents</Typography>
                        </Box>
                      }
                      secondary={`Queue: ${sub.coordinator.metrics?.queueDepth || 0}`}
                    />
                  </ListItem>
                ))}
              </React.Fragment>
            ))}
          </List>
        )}

        {/* Agents */}
        {activeTab === 2 && (
          <Grid container spacing={2}>
            {Array.from(Object.values(treeData?.agents || {})).map((agent: any) => (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={agent.id}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <StatusIcon sx={{ color: agentStatusColors[agent.status], fontSize: 12 }} />
                      <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>{agent.name}</Typography>
                      <Chip size="small" label={agent.status} sx={{ ml: 'auto', bgcolor: agentStatusColors[agent.status], color: 'white' }} />
                    </Box>
                    {agent.currentTask && (
                      <Box sx={{ mb: 1 }}>
                        <Typography variant="caption" color="text.secondary">{agent.currentTask.description}</Typography>
                        <LinearProgress variant="determinate" value={agent.currentTask.progress} sx={{ mt: 0.5 }} />
                      </Box>
                    )}
                    <Typography variant="caption">
                      Success: {(agent.performance?.successRate * 100).toFixed(0)}% | Tasks: {agent.performance?.totalTasks || 0}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}

        {/* Approvals */}
        {activeTab === 3 && (
          <Box>
            {approvals.length === 0 ? (
              <Alert severity="success">No pending approvals</Alert>
            ) : (
              approvals.map((app) => (
                <Card key={app.id} sx={{ mb: 1 }} variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle2">{app.description}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      From: {app.coordinatorId} | Requested: {new Date(app.requestedAt).toLocaleTimeString()}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                      <Button variant="contained" color="success" size="small" onClick={() => handleApproval(app.id, true)}>Approve</Button>
                      <Button variant="outlined" color="error" size="small" onClick={() => handleApproval(app.id, false)}>Reject</Button>
                    </Box>
                  </CardContent>
                </Card>
              ))
            )}
          </Box>
        )}

        {/* Alerts */}
        {activeTab === 4 && (
          <List>
            {alerts.map((alert) => (
              <ListItem key={alert.id}>
                <ListItemIcon>
                  {alert.level === 'critical' ? <ErrorIcon color="error" /> :
                   alert.level === 'warning' ? <WarningIcon color="warning" /> :
                   <SuccessIcon color="info" />}
                </ListItemIcon>
                <ListItemText
                  primary={alert.message}
                  secondary={`${alert.source} | ${new Date(alert.timestamp).toLocaleTimeString()}`}
                />
                <Button
                  size="small"
                  variant="outlined"
                  disabled={alert.acknowledged}
                  onClick={() => {
                    fetch(`/api/hierarchical/alerts/${alert.id}/acknowledge`, { method: 'POST' });
                    fetchData();
                  }}
                >
                  {alert.acknowledged ? 'Acknowledged' : 'Acknowledge'}
                </Button>
              </ListItem>
            ))}
          </List>
        )}
      </Box>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
