"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft, ArrowUpRight, Clock3, Link2, MessageCircle, TriangleAlert, X } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"

type TaskStatus = "open" | "in_progress" | "blocked" | "deferred" | "closed"

type Task = {
  id: string
  title: string
  description: string
  status: TaskStatus
  priority: 0 | 1 | 2 | 3 | 4
  issueType: string
  assignee: string
  owner: string
  labels: string[]
  blockedReason: string
  updatedAgo: string
  dependencyCount: number
  blockedByCount: number
  commentCount: number
  unread: boolean
}

type Epic = {
  id: string
  name: string
  progress: number
  openCount: number
  tasks: Task[]
}

const palette = {
  primary: "#F2A62F",
  secondary: "#00D1A8",
  accent: "#0FC5AE",
  eggplant: "#4A2F63",
  bg: "#2D2E3C",
  surface: "#333341",
  border: "#4A4D5C",
  text: "#EDEBE5",
  textSecondary: "#B8B7B1",
  mutedBg: "#2F2F3E",
  success: "#0FC5AE",
  warning: "#D28A2C",
  error: "#D64545",
  info: "#00D1A8",
  atmosphereWarm: "#5A4632",
  atmosphereCool: "#23484D",
}

const initialEpics: Epic[] = [
  {
    id: "bb-ui2",
    name: "Unified UX - Earthy Dark Shell",
    progress: 69,
    openCount: 11,
    tasks: [
      { id: "bb-atf", title: "Agent swarm-view-integrator", description: "Integrate swarm view into social workroom shell.", status: "open", priority: 1, issueType: "task", assignee: "sarah.lee", owner: "swarm-team", labels: ["social", "swarm"], blockedReason: "", updatedAgo: "8m", dependencyCount: 1, blockedByCount: 0, commentCount: 3, unread: true },
      { id: "bb-z6s", title: "Agent social-view-integrator", description: "Wire social stream cards and panel routing.", status: "in_progress", priority: 0, issueType: "feature", assignee: "alex.chen", owner: "social-team", labels: ["social", "ui"], blockedReason: "", updatedAgo: "14m", dependencyCount: 2, blockedByCount: 0, commentCount: 7, unread: true },
      { id: "bb-nuy", title: "Agent swarm-card-builder", description: "Build consistent swarm card visuals and metadata.", status: "blocked", priority: 0, issueType: "bug", assignee: "alex.chen", owner: "swarm-team", labels: ["swarm", "cards"], blockedReason: "Waiting on dependency bb-ui2.0", updatedAgo: "35m", dependencyCount: 3, blockedByCount: 1, commentCount: 5, unread: true },
      { id: "bb-3ha", title: "Agent sessions-integrator", description: "Session metrics panel integrated and verified.", status: "closed", priority: 2, issueType: "chore", assignee: "alex.chen", owner: "sessions-team", labels: ["sessions"], blockedReason: "", updatedAgo: "2h", dependencyCount: 0, blockedByCount: 0, commentCount: 4, unread: false },
    ],
  },
  {
    id: "bb-xhm",
    name: "Timeline and Activity Feed",
    progress: 80,
    openCount: 5,
    tasks: [
      { id: "bb-3dv", title: "Agent rightpanel-builder", description: "Implement right rail card stack and compact activity.", status: "open", priority: 2, issueType: "task", assignee: "alex.chen", owner: "layout-team", labels: ["layout", "right-panel"], blockedReason: "", updatedAgo: "11m", dependencyCount: 1, blockedByCount: 0, commentCount: 1, unread: true },
      { id: "bb-dwz", title: "Agent leftpanel-builder", description: "Epic->task navigation with search and metadata icons.", status: "in_progress", priority: 1, issueType: "feature", assignee: "sarah.lee", owner: "layout-team", labels: ["layout", "left-panel"], blockedReason: "", updatedAgo: "19m", dependencyCount: 0, blockedByCount: 0, commentCount: 6, unread: true },
      { id: "bb-5am", title: "Agent topbar-builder", description: "Topbar controls and filter sync.", status: "blocked", priority: 1, issueType: "bug", assignee: "agent-007", owner: "layout-team", labels: ["topbar"], blockedReason: "Navigation contract mismatch", updatedAgo: "41m", dependencyCount: 2, blockedByCount: 1, commentCount: 2, unread: false },
      { id: "bb-z2l", title: "Agent mobile-nav-builder", description: "Mobile drawer flow for three-pane shell.", status: "deferred", priority: 1, issueType: "task", assignee: "sarah.lee", owner: "mobile-team", labels: ["mobile", "navigation"], blockedReason: "", updatedAgo: "52m", dependencyCount: 0, blockedByCount: 0, commentCount: 2, unread: false },
    ],
  },
]

function statusClasses(status: TaskStatus) {
  if (status === "in_progress") return "border-l-[3px] border-l-[#0FC5AE] bg-[linear-gradient(145deg,#333341,#2F2F3E)]"
  if (status === "blocked") return "border-l-[3px] border-l-[#D64545] bg-[linear-gradient(145deg,#333341,#302B31)]"
  if (status === "deferred") return "border-l-[3px] border-l-[#D28A2C] bg-[linear-gradient(145deg,#333341,#342F29)]"
  if (status === "closed") return "border-l-[3px] border-l-[#6D6F7B] bg-[linear-gradient(145deg,#333341,#2F3039)]"
  return "border-l-[3px] border-l-[#00D1A8] bg-[linear-gradient(145deg,#333341,#2D313D)]"
}

function statusBadge(status: TaskStatus) {
  if (status === "in_progress") return "bg-[#0FC5AE] text-[#0E2220]"
  if (status === "blocked") return "bg-[#D64545] text-white"
  if (status === "deferred") return "bg-[#D28A2C] text-[#24190C]"
  if (status === "closed") return "bg-[#5A5D6A] text-[#D4D6DE]"
  return "bg-[#00D1A8] text-[#07221C]"
}

const panelClass = "rounded-2xl border shadow-[0_16px_40px_rgba(0,0,0,0.28)] backdrop-blur-[2px]"
const subPanelClass = "rounded-xl border"

function updateQuery(searchParams: URLSearchParams, updates: Record<string, string | null>) {
  const next = new URLSearchParams(searchParams.toString())
  for (const [key, value] of Object.entries(updates)) {
    if (!value) next.delete(key)
    else next.set(key, value)
  }
  const qs = next.toString()
  return qs ? `?${qs}` : "?"
}

export default function MockupPage() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const [epics, setEpics] = useState(initialEpics)
  const [query, setQuery] = useState("")
  const [leftMode, setLeftMode] = useState<"epics" | "tasks">("epics")

  const urlEpic = searchParams.get("epic")
  const urlTask = searchParams.get("task")
  const urlThread = searchParams.get("thread") === "open"

  const initialEpic = epics.find((epic) => epic.id === urlEpic) ?? epics[0]
  const [selectedEpicId, setSelectedEpicId] = useState(initialEpic.id)
  const [selectedTaskId, setSelectedTaskId] = useState(urlTask ?? initialEpic.tasks[0].id)
  const [threadOpen, setThreadOpen] = useState(urlThread)
  const [threadEditMode, setThreadEditMode] = useState(false)

  const [draftTitle, setDraftTitle] = useState("")
  const [draftDescription, setDraftDescription] = useState("")
  const [draftStatus, setDraftStatus] = useState<TaskStatus>("open")
  const [draftPriority, setDraftPriority] = useState<0 | 1 | 2 | 3 | 4>(2)
  const [draftIssueType, setDraftIssueType] = useState("")
  const [draftAssignee, setDraftAssignee] = useState("")
  const [draftOwner, setDraftOwner] = useState("")
  const [draftLabels, setDraftLabels] = useState("")
  const [draftBlockedReason, setDraftBlockedReason] = useState("")
  const [savePulse, setSavePulse] = useState(false)

  const closeThread = useCallback(() => {
    setThreadOpen(false)
    setThreadEditMode(false)
  }, [])

  useEffect(() => {
    const next = updateQuery(searchParams, {
      epic: selectedEpicId,
      task: selectedTaskId,
      thread: threadOpen ? "open" : null,
    })
    router.replace(next, { scroll: false })
  }, [router, searchParams, selectedEpicId, selectedTaskId, threadOpen])

  useEffect(() => {
    if (!threadOpen) {
      return
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeThread()
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [threadOpen, closeThread])

  const selectedEpic = epics.find((epic) => epic.id === selectedEpicId) ?? epics[0]
  const filteredTasks = useMemo(() => {
    const q = query.trim().toLowerCase()
    return selectedEpic.tasks.filter((task) => `${task.id} ${task.title}`.toLowerCase().includes(q))
  }, [query, selectedEpic.tasks])
  const selectedTask = filteredTasks.find((task) => task.id === selectedTaskId) ?? filteredTasks[0]

  useEffect(() => {
    if (!selectedTask) return
    setDraftTitle(selectedTask.title)
    setDraftDescription(selectedTask.description)
    setDraftStatus(selectedTask.status)
    setDraftPriority(selectedTask.priority)
    setDraftIssueType(selectedTask.issueType)
    setDraftAssignee(selectedTask.assignee)
    setDraftOwner(selectedTask.owner)
    setDraftLabels(selectedTask.labels.join(", "))
    setDraftBlockedReason(selectedTask.blockedReason)
    setThreadEditMode(false)
  }, [selectedTask?.id])

  const saveTaskChanges = () => {
    if (!selectedTask) return
    const nextLabels = draftLabels
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean)
    setEpics((current) =>
      current.map((epic) =>
        epic.id !== selectedEpicId
          ? epic
          : {
              ...epic,
              tasks: epic.tasks.map((task) =>
                task.id !== selectedTask.id
                  ? task
                  : {
                      ...task,
                      title: draftTitle,
                      description: draftDescription,
                      status: draftStatus,
                      priority: draftPriority,
                      issueType: draftIssueType,
                      assignee: draftAssignee,
                      owner: draftOwner,
                      labels: nextLabels,
                      blockedReason: draftBlockedReason,
                      updatedAgo: "now",
                      blockedByCount: draftStatus === "blocked" ? Math.max(task.blockedByCount, 1) : 0,
                    }
              ),
            }
      )
    )
    setSavePulse(true)
    setTimeout(() => setSavePulse(false), 900)
  }

  return (
    <main className="min-h-screen" style={{ backgroundColor: palette.bg, color: palette.text }}>
      <div
        className="min-h-screen"
        style={{
          backgroundImage:
            `radial-gradient(circle at 12% 16%, rgba(90,70,50,0.55), transparent 34%), radial-gradient(circle at 88% 82%, rgba(35,72,77,0.50), transparent 32%)`,
        }}
      >
        <div className="mx-auto max-w-[1500px] px-4 py-6 md:px-8 md:py-8">
          <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-4xl font-semibold tracking-tight leading-[1.02] md:text-5xl">Social Workroom</h1>
              <p className="mt-2 text-sm" style={{ color: palette.textSecondary }}>Task-first center. Epic drill-in. Live awareness rail.</p>
            </div>
            <Badge className="rounded-full px-3 py-1 text-xs text-white" style={{ backgroundColor: palette.eggplant }}>mockup route</Badge>
          </header>

          <section className="grid gap-4 lg:grid-cols-[24%_52%_24%]">
            <Card className={panelClass} style={{ backgroundColor: palette.surface, borderColor: palette.border }}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                {leftMode === "tasks" ? (
                  <Button variant="ghost" className="h-8 px-2" onClick={() => setLeftMode("epics")}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to epics
                  </Button>
                ) : (
                  <CardTitle className="text-lg">Epics</CardTitle>
                )}
                <Badge className="rounded-full" style={{ backgroundColor: palette.mutedBg, color: palette.textSecondary }}>{selectedEpic.openCount} open</Badge>
                </div>
                <CardDescription style={{ color: palette.textSecondary }}>Select an epic, then choose a task.</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={leftMode === "epics" ? "Search epics" : "Search tasks"}
                className="mb-3"
                style={{ backgroundColor: palette.mutedBg, borderColor: palette.border }}
              />
              <ScrollArea className="h-[520px] pr-2">
                <div className="space-y-2">
                  {leftMode === "epics"
                    ? epics
                        .filter((epic) => epic.name.toLowerCase().includes(query.toLowerCase()))
                        .map((epic) => (
                          <button
                            key={epic.id}
                            type="button"
                            className={`${subPanelClass} w-full p-3 text-left transition duration-200 hover:-translate-y-[1px] hover:shadow-[0_10px_24px_rgba(0,0,0,0.35)]`}
                            style={{ backgroundColor: palette.surface, borderColor: palette.border }}
                            onClick={() => {
                              setSelectedEpicId(epic.id)
                              setSelectedTaskId(epic.tasks[0]?.id ?? "")
                              setLeftMode("tasks")
                              closeThread()
                            }}
                          >
                            <p className="text-sm font-semibold">{epic.name}</p>
                            <p className="mt-1 text-xs" style={{ color: palette.textSecondary }}>{epic.id}</p>
                          </button>
                        ))
                    : filteredTasks.map((task) => (
                        <button
                          key={task.id}
                          type="button"
                          onClick={() => {
                            setSelectedTaskId(task.id)
                            closeThread()
                          }}
                          className={`${subPanelClass} w-full p-3 text-left transition duration-200 ${
                            selectedTask?.id === task.id
                              ? "shadow-[0_12px_26px_rgba(0,0,0,0.4)]"
                              : "hover:-translate-y-[1px] hover:shadow-[0_10px_22px_rgba(0,0,0,0.33)]"
                          }`}
                          style={{
                            backgroundColor: selectedTask?.id === task.id ? palette.mutedBg : palette.surface,
                            borderColor: selectedTask?.id === task.id ? palette.primary : palette.border,
                          }}
                        >
                          <p className="text-sm font-semibold">{task.id}</p>
                          <p className="mt-1 line-clamp-1 text-xs" style={{ color: palette.textSecondary }}>{task.title}</p>
                          <div className="mt-2 flex items-center gap-3 text-[11px]" style={{ color: palette.textSecondary }}>
                            <span className="inline-flex items-center gap-1"><Clock3 className="h-3 w-3" />{task.updatedAgo}</span>
                            <span className="inline-flex items-center gap-1"><Link2 className="h-3 w-3" />{task.dependencyCount}</span>
                            <span className="inline-flex items-center gap-1"><MessageCircle className="h-3 w-3" />{task.commentCount}</span>
                          </div>
                        </button>
                      ))}
                </div>
              </ScrollArea>
              </CardContent>
            </Card>

            <Card className={panelClass} style={{ backgroundColor: palette.surface, borderColor: palette.border }}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">{selectedEpic.name}</CardTitle>
                  <CardDescription style={{ color: palette.textSecondary }}>Task cards + thread context</CardDescription>
                </div>
                <Button className="h-8 rounded-full px-4 text-white" style={{ backgroundColor: palette.primary }}>New update</Button>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
              <ScrollArea className="h-[430px] pr-2">
                <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                  {filteredTasks.map((task) => (
                    <button
                      key={task.id}
                      type="button"
                      onClick={() => setSelectedTaskId(task.id)}
                      className={`rounded-xl border p-4 text-left transition duration-200 hover:-translate-y-[1px] hover:shadow-[0_14px_28px_rgba(0,0,0,0.35)] ${statusClasses(task.status)}`}
                      style={{ borderColor: selectedTask?.id === task.id ? palette.primary : palette.border }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold" style={{ color: palette.eggplant }}>{task.id}</span>
                        <Badge className={`rounded-full px-2 py-0.5 text-[11px] ${statusBadge(task.status)}`}>{task.status.replace("_", " ")}</Badge>
                      </div>
                      <p className="mt-3 text-[1.7rem] font-semibold leading-[1.15]">{task.title}</p>
                      <p className="mt-2 line-clamp-2 text-sm" style={{ color: palette.textSecondary }}>{task.description}</p>
                      <div className="mt-4 flex items-center gap-3 text-xs" style={{ color: palette.textSecondary }}>
                        <span className="inline-flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" />{task.updatedAgo}</span>
                        <span className="inline-flex items-center gap-1"><Link2 className="h-3.5 w-3.5" />{task.dependencyCount}</span>
                        <span className="inline-flex items-center gap-1"><MessageCircle className="h-3.5 w-3.5" />{task.commentCount}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </ScrollArea>
              <Separator className="my-4" />
              <div className={`${subPanelClass} p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]`} style={{ borderColor: palette.border, backgroundColor: palette.mutedBg }}>
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-semibold">Conversation: {selectedTask?.id}</p>
                <Button variant="ghost" className="h-7 px-2" style={{ color: palette.secondary }} onClick={() => setThreadOpen(true)}>
                  Open thread <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
                </Button>
                </div>
                <div className="space-y-2">
                  <div className="rounded-lg border px-3 py-2 text-sm" style={{ borderColor: "#5A5D6A", backgroundColor: "#2A2B37" }}>
                    <span className="font-semibold" style={{ color: palette.success }}>alex.chen</span>
                    <span className="mx-1 text-xs" style={{ color: "#8F92A3" }}>2m</span>
                    <span style={{ color: palette.textSecondary }}>Need confirmation that detail strip stays sticky while card grid scrolls.</span>
                  </div>
                  <div className="rounded-lg border px-3 py-2 text-sm" style={{ borderColor: "#5A5D6A", backgroundColor: "#2A2B37" }}>
                    <span className="font-semibold" style={{ color: palette.secondary }}>sarah.lee</span>
                    <span className="mx-1 text-xs" style={{ color: "#8F92A3" }}>1m</span>
                    <span style={{ color: palette.textSecondary }}>Approved if right rail remains visible at 1280px breakpoint.</span>
                  </div>
                </div>
              </div>
              </CardContent>
            </Card>

            <Card className={panelClass} style={{ backgroundColor: palette.surface, borderColor: palette.border }}>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Live Context</CardTitle>
                <CardDescription style={{ color: palette.textSecondary }}>Persistent awareness while working tasks.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-0">
              <div className={`${subPanelClass} p-3 shadow-[0_8px_20px_rgba(0,0,0,0.25)]`} style={{ borderColor: palette.border, backgroundColor: palette.mutedBg }}>
                <p className="mb-2 text-sm font-semibold">Live Agents</p>
                <div className="space-y-1 text-sm">
                  <p className="flex items-center justify-between"><span>swarm-view-integrator</span><span style={{ color: palette.success }}>online</span></p>
                  <p className="flex items-center justify-between"><span>social-view-integrator</span><span style={{ color: palette.warning }}>away</span></p>
                  <p className="flex items-center justify-between"><span>graph-integrator</span><span style={{ color: palette.info }}>busy</span></p>
                </div>
              </div>
              <div className={`${subPanelClass} p-3 shadow-[0_8px_20px_rgba(0,0,0,0.25)]`} style={{ borderColor: palette.border, backgroundColor: palette.mutedBg }}>
                <p className="mb-2 text-sm font-semibold">Recent Activity</p>
                <div className="space-y-1 text-xs" style={{ color: palette.textSecondary }}>
                  <p>5m · bb-z6s moved to in progress</p>
                  <p>11m · bb-atf received 2 comments</p>
                  <p>18m · bb-3ha marked closed</p>
                  <p>33m · bb-nuy dependency changed</p>
                </div>
              </div>
              <div className={`${subPanelClass} p-3 shadow-[0_8px_20px_rgba(0,0,0,0.22)]`} style={{ borderColor: "#6A4E2F", backgroundColor: "#3A332B" }}>
                <p className="mb-2 text-sm font-semibold">Attention</p>
                <p className="flex items-center gap-2 text-sm" style={{ color: "#F2C684" }}><TriangleAlert className="h-4 w-4" /> 2 blocked tasks in selected epic</p>
              </div>
              </CardContent>
            </Card>
          </section>
        </div>
      </div>

      {threadOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/35 p-2 md:items-center md:p-4" onClick={closeThread}>
          <div
            className={`${panelClass} w-full max-w-[980px] p-4 md:p-5`}
            style={{
              borderColor: "#5B5E71",
              background: "linear-gradient(180deg,#323342,#2A2B38)",
              color: palette.text,
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-lg font-semibold">Thread · {selectedTask?.id}</p>
                <p className="text-xs" style={{ color: palette.textSecondary }}>Bead summary and inline edit mode</p>
              </div>
              <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-white/10" aria-label="Close thread" onClick={closeThread}><X className="h-4 w-4" /></Button>
            </div>
            <div className="mt-3 rounded-xl border p-4" style={{ borderColor: "#55586A", backgroundColor: "#2A2B37" }}>
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-semibold">{threadEditMode ? "Edit task" : "Task summary"}</p>
                <Badge className="rounded-full px-2 py-0.5 text-[11px]" style={{ backgroundColor: savePulse ? palette.success : "#3C3E4E", color: savePulse ? "#0E2220" : "#B8B7B1" }}>
                  {savePulse ? "saved" : "ready"}
                </Badge>
              </div>
              {!threadEditMode ? (
                <div className="space-y-3 text-sm">
                  <div className="rounded-lg border p-3" style={{ borderColor: "#585B6D", backgroundColor: "#323342" }}>
                    <p className="text-xs mb-1" style={{ color: "#A4A7B7" }}>{selectedTask?.id}</p>
                    <p className="font-semibold text-base text-[#ECEBE5]">{selectedTask?.title}</p>
                    <p className="mt-1" style={{ color: palette.textSecondary }}>{selectedTask?.description}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-lg border p-2" style={{ borderColor: "#585B6D", backgroundColor: "#323342" }}>Status: {selectedTask?.status}</div>
                    <div className="rounded-lg border p-2" style={{ borderColor: "#585B6D", backgroundColor: "#323342" }}>Priority: P{selectedTask?.priority}</div>
                    <div className="rounded-lg border p-2" style={{ borderColor: "#585B6D", backgroundColor: "#323342" }}>Assignee: {selectedTask?.assignee || "-"}</div>
                    <div className="rounded-lg border p-2" style={{ borderColor: "#585B6D", backgroundColor: "#323342" }}>Owner: {selectedTask?.owner || "-"}</div>
                    <div className="rounded-lg border p-2 col-span-2" style={{ borderColor: "#585B6D", backgroundColor: "#323342" }}>
                      Labels: {selectedTask?.labels.join(", ") || "-"}
                    </div>
                    <div className="rounded-lg border p-2 col-span-2" style={{ borderColor: "#585B6D", backgroundColor: "#323342" }}>
                      Blocked reason: {selectedTask?.blockedReason || "None"}
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Button className="rounded-full px-4 text-[#24190C]" style={{ backgroundColor: palette.primary }} onClick={() => setThreadEditMode(true)}>
                      Edit
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <div>
                      <p className="mb-1 text-xs" style={{ color: palette.textSecondary }}>Title</p>
                      <Input value={draftTitle} onChange={(event) => setDraftTitle(event.target.value)} style={{ backgroundColor: "#323342", borderColor: "#585B6D", color: palette.text }} />
                    </div>
                    <div>
                      <p className="mb-1 text-xs" style={{ color: palette.textSecondary }}>Assignee</p>
                      <Input value={draftAssignee} onChange={(event) => setDraftAssignee(event.target.value)} style={{ backgroundColor: "#323342", borderColor: "#585B6D", color: palette.text }} />
                    </div>
                    <div className="md:col-span-2">
                      <p className="mb-1 text-xs" style={{ color: palette.textSecondary }}>Description</p>
                      <Input value={draftDescription} onChange={(event) => setDraftDescription(event.target.value)} style={{ backgroundColor: "#323342", borderColor: "#585B6D", color: palette.text }} />
                    </div>
                    <div>
                      <p className="mb-1 text-xs" style={{ color: palette.textSecondary }}>Issue type</p>
                      <Input value={draftIssueType} onChange={(event) => setDraftIssueType(event.target.value)} style={{ backgroundColor: "#323342", borderColor: "#585B6D", color: palette.text }} />
                    </div>
                    <div>
                      <p className="mb-1 text-xs" style={{ color: palette.textSecondary }}>Owner</p>
                      <Input value={draftOwner} disabled style={{ backgroundColor: "#323342", borderColor: "#585B6D", color: palette.text, opacity: 0.7 }} />
                    </div>
                    <div className="md:col-span-2">
                      <p className="mb-1 text-xs" style={{ color: palette.textSecondary }}>Labels (comma separated)</p>
                      <Input value={draftLabels} onChange={(event) => setDraftLabels(event.target.value)} style={{ backgroundColor: "#323342", borderColor: "#585B6D", color: palette.text }} />
                    </div>
                  </div>
                  <div className="mt-3">
                    <p className="mb-1 text-xs" style={{ color: palette.textSecondary }}>Status</p>
                    <div className="flex flex-wrap gap-2">
                      {(["open", "in_progress", "blocked", "deferred", "closed"] as TaskStatus[]).map((status) => (
                        <button
                          key={status}
                          type="button"
                          className={`rounded-full border px-2 py-1 text-xs ${draftStatus === status ? statusBadge(status) : ""}`}
                          style={{
                            borderColor: draftStatus === status ? "transparent" : palette.border,
                            backgroundColor: draftStatus === status ? undefined : "#323342",
                            color: draftStatus === status ? undefined : palette.textSecondary,
                          }}
                          onClick={() => setDraftStatus(status)}
                        >
                          {status.replace("_", " ")}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="mt-3">
                    <p className="mb-1 text-xs" style={{ color: palette.textSecondary }}>Priority</p>
                    <div className="flex flex-wrap gap-2">
                      {([0, 1, 2, 3, 4] as const).map((priority) => (
                        <button
                          key={priority}
                          type="button"
                          onClick={() => setDraftPriority(priority)}
                          className="rounded-full border px-2 py-1 text-xs"
                          style={{
                            borderColor: draftPriority === priority ? palette.eggplant : palette.border,
                            backgroundColor: draftPriority === priority ? "#F4EAFE" : palette.surface,
                            color: draftPriority === priority ? palette.eggplant : palette.textSecondary,
                          }}
                        >
                          P{priority}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="mt-3">
                    <p className="mb-1 text-xs" style={{ color: palette.textSecondary }}>Blocked reason</p>
                    <Input value={draftBlockedReason} onChange={(event) => setDraftBlockedReason(event.target.value)} style={{ backgroundColor: "#323342", borderColor: "#585B6D", color: palette.text }} />
                  </div>
                  <div className="mt-4 flex justify-end gap-2">
                    <Button variant="outline" className="rounded-full px-4 border-[#585B6D] bg-[#323342] text-[#B8B7B1] hover:bg-[#3A3B49]" onClick={() => setThreadEditMode(false)}>
                      Cancel
                    </Button>
                    <Button className="rounded-full px-4 text-[#24190C]" style={{ backgroundColor: palette.primary }} onClick={() => { saveTaskChanges(); setThreadEditMode(false) }}>
                      Save changes
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </main>
  )
}
