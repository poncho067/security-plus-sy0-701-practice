(function () {
  "use strict";

  const BANK_URL = "./security_plus_sy0_701_advanced_questions.json";
  const STORAGE = {
    settings: "sec701.settings.v1",
    progress: "sec701.progress.v1",
    activeQuiz: "sec701.activeQuiz.v1"
  };

  const DEFAULT_SETTINGS = {
    mode: "general",
    objective: "",
    difficulty: "hard",
    questionCount: 25,
    timePerQuestion: 60
  };

  const DIFFICULTIES = [
    { id: "easy", label: "Easy" },
    { id: "normal", label: "Normal" },
    { id: "hard", label: "Hard" },
    { id: "extra-hard", label: "Extra hard" }
  ];

  const state = {
    metadata: null,
    questions: [],
    objectives: [],
    progress: createEmptyProgress(),
    settings: { ...DEFAULT_SETTINGS },
    activeQuiz: null,
    lastResult: null,
    view: "loading",
    timerId: null,
    overviewOpen: false,
    selectionNotice: ""
  };

  const app = document.getElementById("app");

  function createEmptyProgress() {
    return {
      answered: 0,
      correct: 0,
      completedQuizzes: 0,
      byObjective: {},
      history: [],
      seenQuestionIds: []
    };
  }

  function safeJsonRead(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (error) {
      return fallback;
    }
  }

  function safeJsonWrite(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function normalizeDifficulty(value) {
    const normalized = String(value || "hard").toLowerCase().trim().replace(/[\s_]+/g, "-");
    if (["easy", "basic", "beginner", "foundational"].includes(normalized)) return "easy";
    if (["normal", "medium", "moderate", "intermediate", "standard"].includes(normalized)) return "normal";
    if (["hard", "advanced", "difficult"].includes(normalized)) return "hard";
    if (["extra-hard", "expert", "very-hard", "extreme"].includes(normalized)) return "extra-hard";
    return normalized;
  }

  function difficultyLabel(id) {
    return DIFFICULTIES.find((item) => item.id === id)?.label || id;
  }

  function formatDate(value) {
    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit"
    }).format(new Date(value));
  }

  function shuffle(items) {
    const copy = [...items];
    for (let index = copy.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
    }
    return copy;
  }

  function percent(correct, total) {
    if (!total) return 0;
    return Math.round((correct / total) * 100);
  }

  function sameAnswers(selected, correct) {
    if (selected.length !== correct.length) return false;
    const selectedSorted = [...selected].sort();
    const correctSorted = [...correct].sort();
    return selectedSorted.every((answer, index) => answer === correctSorted[index]);
  }

  function getQuestionById(id) {
    return state.questions.find((question) => question.id === id || question.global_id === id);
  }

  function getObjectiveOptions() {
    const grouped = new Map();
    for (const question of state.questions) {
      if (!grouped.has(question.objective)) {
        grouped.set(question.objective, {
          objective: question.objective,
          domain: question.domain,
          count: 0
        });
      }
      grouped.get(question.objective).count += 1;
    }
    return [...grouped.values()].sort((a, b) => a.objective.localeCompare(b.objective, undefined, { numeric: true }));
  }

  function getDifficultyCounts(scopeQuestions = state.questions) {
    return DIFFICULTIES.reduce((counts, difficulty) => {
      counts[difficulty.id] = scopeQuestions.filter((question) => normalizeDifficulty(question.difficulty) === difficulty.id).length;
      return counts;
    }, {});
  }

  function getScopedQuestions(settings) {
    if (settings.mode === "objective" && settings.objective) {
      return state.questions.filter((question) => question.objective === settings.objective);
    }
    return state.questions;
  }

  function getEligibleQuestions(settings) {
    const scoped = getScopedQuestions(settings);
    const difficultyMatches = scoped.filter((question) => normalizeDifficulty(question.difficulty) === settings.difficulty);
    return {
      scoped,
      questions: difficultyMatches.length ? difficultyMatches : scoped,
      usedFallback: difficultyMatches.length === 0 && scoped.length > 0
    };
  }

  function clampSettings(settings) {
    const eligible = getEligibleQuestions(settings);
    const maxCount = Math.max(1, eligible.questions.length);
    const questionCount = Math.min(Math.max(Number(settings.questionCount) || 1, 1), maxCount);
    const timePerQuestion = Math.min(Math.max(Number(settings.timePerQuestion) || 60, 10), 300);
    return { ...settings, questionCount, timePerQuestion };
  }

  function saveSettings(nextSettings) {
    state.settings = clampSettings(nextSettings);
    safeJsonWrite(STORAGE.settings, state.settings);
  }

  function renderShell(content) {
    app.innerHTML = content;
  }

  function render() {
    if (state.timerId) {
      clearInterval(state.timerId);
      state.timerId = null;
    }

    if (state.view === "loading") {
      renderShell(`
        <main class="loading-screen" aria-live="polite">
          <div class="loader"></div>
          <p>Loading Security+ practice bank...</p>
        </main>
      `);
      return;
    }

    if (state.view === "error") {
      renderShell(`
        <main class="error-screen">
          <section class="panel">
            <h1>Question bank could not be loaded</h1>
            <p class="muted">Start the local server from this folder so the browser can fetch the JSON file.</p>
          </section>
        </main>
      `);
      return;
    }

    if (state.view === "quiz" && state.activeQuiz) {
      renderQuiz();
      startTimer();
      return;
    }

    if (state.view === "results" && state.lastResult) {
      renderResults();
      return;
    }

    renderMenu();
  }

  function renderTopbar() {
    const accuracy = percent(state.progress.correct, state.progress.answered);
    return `
      <header class="topbar">
        <div class="brand">
          <h1>Security+ SY0-701 Practice</h1>
          <p>${escapeHtml(state.metadata?.question_count || state.questions.length)} original questions across ${state.objectives.length} objectives</p>
        </div>
        <div class="status-strip" aria-label="Saved progress">
          <div class="metric">
            <span>Answered</span>
            <strong>${state.progress.answered}</strong>
          </div>
          <div class="metric">
            <span>Accuracy</span>
            <strong>${accuracy}%</strong>
          </div>
          <div class="metric">
            <span>Quizzes</span>
            <strong>${state.progress.completedQuizzes}</strong>
          </div>
        </div>
      </header>
    `;
  }

  function renderMenu() {
    state.settings = clampSettings(state.settings);
    const eligible = getEligibleQuestions(state.settings);
    const scopeCounts = getDifficultyCounts(eligible.scoped);
    const maxCount = Math.max(1, eligible.questions.length);
    const objectiveOptions = state.objectives.map((item) => `
      <option value="${escapeHtml(item.objective)}" ${item.objective === state.settings.objective ? "selected" : ""}>
        ${escapeHtml(item.objective)} (${item.count})
      </option>
    `).join("");
    const difficultyButtons = DIFFICULTIES.map((difficulty) => `
      <button type="button" data-difficulty="${difficulty.id}" aria-pressed="${state.settings.difficulty === difficulty.id}">
        ${difficulty.label}
      </button>
    `).join("");
    const latestHistory = state.progress.history.slice(0, 5);
    const resumeMarkup = state.activeQuiz ? `
      <button type="button" class="resume-button" id="resumeQuiz">
        <span>Resume saved quiz</span>
        <strong>${state.activeQuiz.currentIndex + 1}/${state.activeQuiz.questionIds.length}</strong>
      </button>
    ` : "";
    const notice = eligible.usedFallback ? `
      <p class="notice">No ${escapeHtml(difficultyLabel(state.settings.difficulty).toLowerCase())} questions were found in this scope, so this quiz will use the available bank.</p>
    ` : "";

    renderShell(`
      ${renderTopbar()}
      <main class="menu-grid">
        <section class="panel" aria-labelledby="settingsTitle">
          <h2 id="settingsTitle">Quiz Settings</h2>
          ${resumeMarkup}
          <div class="settings-grid">
            <fieldset class="field">
              <legend>Practice scope</legend>
              <div class="segmented">
                <button type="button" data-mode="general" aria-pressed="${state.settings.mode === "general"}">General mix</button>
                <button type="button" data-mode="objective" aria-pressed="${state.settings.mode === "objective"}">Focused objective</button>
              </div>
            </fieldset>

            <div class="field">
              <label for="objectiveSelect">Objective</label>
              <select id="objectiveSelect" ${state.settings.mode === "general" ? "disabled" : ""}>
                ${objectiveOptions}
              </select>
              <p class="helper">${state.settings.mode === "general" ? "General mix samples across all exam objectives." : "Focused mode uses the selected objective only."}</p>
            </div>

            <fieldset class="field">
              <legend>Difficulty</legend>
              <div class="segmented difficulty-grid">
                ${difficultyButtons}
              </div>
              <p class="helper">Available in scope: easy ${scopeCounts.easy}, normal ${scopeCounts.normal}, hard ${scopeCounts.hard}, extra hard ${scopeCounts["extra-hard"]}.</p>
            </fieldset>

            ${notice}

            <div class="field">
              <label for="questionCount">Questions</label>
              <div class="range-row">
                <input id="questionCountRange" type="range" min="1" max="${maxCount}" value="${state.settings.questionCount}">
                <input id="questionCount" type="number" min="1" max="${maxCount}" value="${state.settings.questionCount}">
              </div>
              <p class="helper">${eligible.questions.length} questions match the current scope.</p>
            </div>

            <div class="field">
              <label for="timePerQuestion">Time per question</label>
              <div class="range-row">
                <input id="timeRange" type="range" min="10" max="300" step="5" value="${state.settings.timePerQuestion}">
                <input id="timePerQuestion" type="number" min="10" max="300" step="5" value="${state.settings.timePerQuestion}">
              </div>
              <p class="helper">${state.settings.timePerQuestion} seconds per question.</p>
            </div>

            <div class="actions">
              <button type="button" class="primary-button" id="startQuiz">Start quiz</button>
              <button type="button" class="quiet-button" id="resetProgress">Reset progress</button>
            </div>
          </div>
        </section>

        <aside class="panel" aria-labelledby="progressTitle">
          <h2 id="progressTitle">Progress</h2>
          ${renderProgressSummary()}
          <h3>Recent quizzes</h3>
          ${latestHistory.length ? `
            <div class="history-list">
              ${latestHistory.map((item) => `
                <div class="history-row">
                  <div class="row-head">
                    <strong>${escapeHtml(item.correct)}/${escapeHtml(item.total)} correct</strong>
                    <span>${escapeHtml(formatDate(item.completedAt))}</span>
                  </div>
                  <div class="muted">${escapeHtml(item.scope)} - ${escapeHtml(difficultyLabel(item.difficulty))}</div>
                </div>
              `).join("")}
            </div>
          ` : `<p class="muted">No completed quizzes yet.</p>`}
        </aside>
      </main>
    `);

    bindMenuEvents();
  }

  function renderProgressSummary() {
    const objectiveRows = Object.entries(state.progress.byObjective)
      .map(([objective, value]) => ({ objective, ...value }))
      .sort((a, b) => b.answered - a.answered)
      .slice(0, 6);

    if (!objectiveRows.length) {
      return `<p class="muted">Saved results will appear here after your first quiz.</p>`;
    }

    return `
      <div class="objective-list">
        ${objectiveRows.map((row) => {
          const value = percent(row.correct, row.answered);
          return `
            <div class="objective-row">
              <div class="row-head">
                <strong>${escapeHtml(row.objective)}</strong>
                <span>${value}%</span>
              </div>
              <div class="bar-track"><div class="bar-fill" style="--value: ${value}%"></div></div>
              <div class="muted">${row.correct}/${row.answered} correct</div>
            </div>
          `;
        }).join("")}
      </div>
    `;
  }

  function bindMenuEvents() {
    document.querySelectorAll("[data-mode]").forEach((button) => {
      button.addEventListener("click", () => {
        const mode = button.getAttribute("data-mode");
        const objective = state.settings.objective || state.objectives[0]?.objective || "";
        saveSettings({ ...state.settings, mode, objective });
        render();
      });
    });

    document.querySelectorAll("[data-difficulty]").forEach((button) => {
      button.addEventListener("click", () => {
        saveSettings({ ...state.settings, difficulty: button.getAttribute("data-difficulty") });
        render();
      });
    });

    document.getElementById("objectiveSelect")?.addEventListener("change", (event) => {
      saveSettings({ ...state.settings, objective: event.target.value });
      render();
    });

    const syncNumberSetting = (rangeId, inputId, key) => {
      const range = document.getElementById(rangeId);
      const input = document.getElementById(inputId);
      [range, input].forEach((control) => {
        control?.addEventListener("input", () => {
          saveSettings({ ...state.settings, [key]: Number(control.value) });
          render();
        });
      });
    };

    syncNumberSetting("questionCountRange", "questionCount", "questionCount");
    syncNumberSetting("timeRange", "timePerQuestion", "timePerQuestion");

    document.getElementById("startQuiz")?.addEventListener("click", () => {
      startQuiz(state.settings);
    });

    document.getElementById("resumeQuiz")?.addEventListener("click", () => {
      state.view = "quiz";
      render();
    });

    document.getElementById("resetProgress")?.addEventListener("click", () => {
      if (window.confirm("Reset saved progress and quiz history?")) {
        state.progress = createEmptyProgress();
        safeJsonWrite(STORAGE.progress, state.progress);
        render();
      }
    });
  }

  function selectQuestionIds(settings, avoidIds = []) {
    const eligible = getEligibleQuestions(settings).questions;
    const avoid = new Set(avoidIds);
    const fresh = shuffle(eligible.filter((question) => !avoid.has(question.id)));
    const reused = shuffle(eligible.filter((question) => avoid.has(question.id)));
    const requested = Math.min(settings.questionCount, eligible.length);
    const selected = [...fresh, ...reused].slice(0, requested);
    const reusedCount = selected.filter((question) => avoid.has(question.id)).length;
    state.selectionNotice = reusedCount
      ? `${reusedCount} question${reusedCount === 1 ? "" : "s"} had to be reused because this scope was exhausted.`
      : "";
    return selected.map((question) => question.id);
  }

  function startQuiz(settings, options = {}) {
    const finalSettings = clampSettings(settings);
    saveSettings(finalSettings);
    const questionIds = options.exactQuestionIds?.length
      ? [...options.exactQuestionIds]
      : selectQuestionIds(finalSettings, options.avoidIds || []);

    state.activeQuiz = {
      id: `quiz-${Date.now()}`,
      settings: finalSettings,
      questionIds,
      currentIndex: 0,
      answers: [],
      currentSelection: [],
      timeLeft: finalSettings.timePerQuestion,
      startedAt: new Date().toISOString(),
      chainAskedIds: [...new Set(options.avoidIds || [])]
    };
    safeJsonWrite(STORAGE.activeQuiz, state.activeQuiz);
    state.view = "quiz";
    state.overviewOpen = false;
    render();
  }

  function renderQuiz() {
    const quiz = state.activeQuiz;
    const question = getQuestionById(quiz.questionIds[quiz.currentIndex]);
    const selected = new Set(quiz.currentSelection || []);
    const total = quiz.questionIds.length;
    const progressValue = Math.round(((quiz.currentIndex + 1) / total) * 100);
    const timePercent = Math.max(0, Math.round((quiz.timeLeft / quiz.settings.timePerQuestion) * 100));
    const timerColor = timePercent <= 25 ? "var(--red)" : timePercent <= 50 ? "var(--yellow)" : "var(--green)";
    const multi = question.correct_answers.length > 1;

    renderShell(`
      <main class="quiz-stage">
        <section class="quiz-header" aria-label="Quiz status">
          <div class="quiz-meta">
            <div class="screen-title">
              <h1>Question ${quiz.currentIndex + 1} of ${total}</h1>
              <p>${escapeHtml(question.objective)} - ${escapeHtml(question.topic)}</p>
            </div>
            <div class="pill-row">
              <span class="pill">${escapeHtml(difficultyLabel(quiz.settings.difficulty))}</span>
              <span class="pill">${multi ? "Multiple response" : "Multiple choice"}</span>
              <span class="pill">${progressValue}% complete</span>
            </div>
          </div>
          <div class="timer" aria-label="Question timer">
            <div class="timer-label">
              <span>Time remaining</span>
              <strong>${quiz.timeLeft}s</strong>
            </div>
            <div class="bar-track">
              <div class="timer-fill" style="--time-left: ${timePercent}%; --timer-color: ${timerColor}"></div>
            </div>
          </div>
          ${state.selectionNotice ? `<p class="notice">${escapeHtml(state.selectionNotice)}</p>` : ""}
        </section>

        <section class="quiz-card" aria-labelledby="questionStem">
          <h2 id="questionStem" class="sr-only">Question stem</h2>
          <p class="question-stem">${escapeHtml(question.stem)}</p>
          <div class="answer-grid">
            ${question.choices.map((choice) => `
              <button type="button" class="answer-option" data-choice="${escapeHtml(choice.id)}" aria-pressed="${selected.has(choice.id)}">
                <span class="answer-letter">${escapeHtml(choice.id)}</span>
                <span class="answer-text">${escapeHtml(choice.text)}</span>
              </button>
            `).join("")}
          </div>
          <div class="quiz-actions">
            <button type="button" class="danger-button" id="exitQuiz">Exit quiz</button>
            <button type="button" class="primary-button" id="submitAnswer" ${selected.size ? "" : "disabled"}>${multi ? "Submit answers" : "Submit answer"}</button>
          </div>
        </section>
      </main>
    `);

    document.querySelectorAll("[data-choice]").forEach((button) => {
      button.addEventListener("click", () => {
        const choice = button.getAttribute("data-choice");
        if (multi) {
          const next = new Set(state.activeQuiz.currentSelection || []);
          if (next.has(choice)) next.delete(choice);
          else next.add(choice);
          state.activeQuiz.currentSelection = [...next];
        } else {
          state.activeQuiz.currentSelection = [choice];
        }
        safeJsonWrite(STORAGE.activeQuiz, state.activeQuiz);
        render();
      });
    });

    document.getElementById("submitAnswer")?.addEventListener("click", () => {
      recordCurrentAnswer(false);
    });

    document.getElementById("exitQuiz")?.addEventListener("click", () => {
      if (window.confirm("Exit this quiz and return to the main menu?")) {
        localStorage.removeItem(STORAGE.activeQuiz);
        state.activeQuiz = null;
        state.view = "menu";
        render();
      }
    });
  }

  function startTimer() {
    if (!state.activeQuiz) return;
    state.timerId = window.setInterval(() => {
      if (!state.activeQuiz) return;
      state.activeQuiz.timeLeft = Math.max(0, state.activeQuiz.timeLeft - 1);
      safeJsonWrite(STORAGE.activeQuiz, state.activeQuiz);
      if (state.activeQuiz.timeLeft <= 0) {
        recordCurrentAnswer(true);
      } else {
        renderQuiz();
      }
    }, 1000);
  }

  function recordCurrentAnswer(timedOut) {
    if (!state.activeQuiz) return;
    const quiz = state.activeQuiz;
    const question = getQuestionById(quiz.questionIds[quiz.currentIndex]);
    const selected = timedOut ? [] : [...(quiz.currentSelection || [])];
    const correct = sameAnswers(selected, question.correct_answers);
    const timeSpent = quiz.settings.timePerQuestion - quiz.timeLeft;

    quiz.answers.push({
      questionId: question.id,
      selected,
      correct,
      timedOut,
      timeSpent
    });
    quiz.chainAskedIds = [...new Set([...(quiz.chainAskedIds || []), question.id])];

    if (quiz.currentIndex >= quiz.questionIds.length - 1) {
      finishQuiz();
      return;
    }

    quiz.currentIndex += 1;
    quiz.currentSelection = [];
    quiz.timeLeft = quiz.settings.timePerQuestion;
    safeJsonWrite(STORAGE.activeQuiz, quiz);
    render();
  }

  function finishQuiz() {
    const result = buildResult(state.activeQuiz);
    state.lastResult = result;
    state.progress = updateProgress(result);
    safeJsonWrite(STORAGE.progress, state.progress);
    localStorage.removeItem(STORAGE.activeQuiz);
    state.activeQuiz = null;
    state.view = "results";
    state.overviewOpen = false;
    render();
  }

  function buildResult(quiz) {
    const enrichedAnswers = quiz.answers.map((answer) => {
      const question = getQuestionById(answer.questionId);
      return {
        ...answer,
        question,
        correctAnswers: question.correct_answers,
        objective: question.objective
      };
    });
    const correct = enrichedAnswers.filter((answer) => answer.correct).length;
    const scope = quiz.settings.mode === "objective" ? quiz.settings.objective : "General mix";
    return {
      id: quiz.id,
      settings: quiz.settings,
      questionIds: quiz.questionIds,
      chainAskedIds: [...new Set([...(quiz.chainAskedIds || []), ...quiz.questionIds])],
      answers: enrichedAnswers,
      total: enrichedAnswers.length,
      correct,
      missed: enrichedAnswers.filter((answer) => !answer.correct),
      completedAt: new Date().toISOString(),
      scope
    };
  }

  function updateProgress(result) {
    const next = {
      ...state.progress,
      byObjective: { ...state.progress.byObjective },
      seenQuestionIds: [...new Set([...(state.progress.seenQuestionIds || []), ...result.questionIds])]
    };
    next.answered += result.total;
    next.correct += result.correct;
    next.completedQuizzes += 1;

    for (const answer of result.answers) {
      const current = next.byObjective[answer.objective] || { answered: 0, correct: 0 };
      next.byObjective[answer.objective] = {
        answered: current.answered + 1,
        correct: current.correct + (answer.correct ? 1 : 0)
      };
    }

    next.history = [
      {
        id: result.id,
        completedAt: result.completedAt,
        total: result.total,
        correct: result.correct,
        difficulty: result.settings.difficulty,
        scope: result.scope,
        missedQuestionIds: result.missed.map((answer) => answer.questionId)
      },
      ...(next.history || [])
    ].slice(0, 20);

    return next;
  }

  function renderResults() {
    const result = state.lastResult;
    const score = percent(result.correct, result.total);
    const scoreColor = score >= 80 ? "var(--green)" : score >= 65 ? "var(--yellow)" : "var(--red)";

    renderShell(`
      <main class="results-stage">
        <section class="results-head">
          <div class="screen-title">
            <h1>Quiz Complete</h1>
            <p>${escapeHtml(result.scope)} - ${escapeHtml(difficultyLabel(result.settings.difficulty))} - ${result.total} questions</p>
          </div>
          <div class="score-ring" style="--score: ${score}%; --score-color: ${scoreColor}" aria-label="Score ${score}%">
            <strong>${score}%</strong>
          </div>
        </section>

        <div class="status-strip">
          <div class="metric">
            <span>Correct</span>
            <strong>${result.correct}</strong>
          </div>
          <div class="metric">
            <span>Incorrect</span>
            <strong>${result.total - result.correct}</strong>
          </div>
          <div class="metric">
            <span>Avg time</span>
            <strong>${averageTime(result.answers)}s</strong>
          </div>
        </div>

        <section class="results-actions" aria-label="Post quiz options">
          <button type="button" class="secondary-button" id="showOverview">Overview</button>
          <button type="button" class="secondary-button" id="retryQuiz">Retry</button>
          <button type="button" class="secondary-button" id="practiceMore">Practice more</button>
          <button type="button" class="quiet-button" id="exitResults">Exit</button>
        </section>

        ${state.overviewOpen ? renderOverview(result) : ""}
      </main>
    `);

    document.getElementById("showOverview")?.addEventListener("click", () => {
      state.overviewOpen = !state.overviewOpen;
      render();
    });
    document.getElementById("retryQuiz")?.addEventListener("click", () => {
      startQuiz(result.settings, { exactQuestionIds: result.questionIds });
    });
    document.getElementById("practiceMore")?.addEventListener("click", () => {
      startQuiz(result.settings, { avoidIds: result.chainAskedIds });
    });
    document.getElementById("exitResults")?.addEventListener("click", () => {
      state.lastResult = null;
      state.view = "menu";
      render();
    });
  }

  function averageTime(answers) {
    if (!answers.length) return 0;
    return Math.round(answers.reduce((sum, answer) => sum + answer.timeSpent, 0) / answers.length);
  }

  function choiceText(question, ids) {
    if (!ids.length) return "No answer";
    return ids.map((id) => {
      const choice = question.choices.find((item) => item.id === id);
      return `${id}. ${choice ? choice.text : ""}`;
    }).join(" | ");
  }

  function renderOverview(result) {
    if (!result.missed.length) {
      return `
        <section class="overview">
          <h2>Overview</h2>
          <div class="empty-state">No incorrect answers in this quiz.</div>
        </section>
      `;
    }

    const weakAreas = Object.values(result.missed.reduce((areas, answer) => {
      const key = answer.question.objective;
      if (!areas[key]) {
        areas[key] = { objective: key, count: 0, topics: new Set() };
      }
      areas[key].count += 1;
      areas[key].topics.add(answer.question.topic);
      return areas;
    }, {})).sort((a, b) => b.count - a.count);

    return `
      <section class="overview">
        <h2>Overview</h2>
        <div class="progress-list">
          ${weakAreas.map((area) => `
            <div class="objective-row">
              <div class="row-head">
                <strong>${escapeHtml(area.objective)}</strong>
                <span>${area.count} missed</span>
              </div>
              <div class="muted">${escapeHtml([...area.topics].slice(0, 4).join(", "))}</div>
            </div>
          `).join("")}
        </div>
        <h3>Missed questions</h3>
        <div class="missed-list">
          ${result.missed.map((answer) => renderMissedAnswer(answer)).join("")}
        </div>
      </section>
    `;
  }

  function renderMissedAnswer(answer) {
    const question = answer.question;
    const tags = (question.complexity_tags || [])
      .slice(0, 4)
      .map((tag) => tag.replace(/-/g, " "))
      .join(", ");

    return `
      <article class="missed-item">
        <h4>${escapeHtml(question.objective)} - ${escapeHtml(question.topic)}</h4>
        <p>${escapeHtml(question.stem)}</p>
        <div class="answer-line"><strong>Your answer:</strong> ${escapeHtml(choiceText(question, answer.selected))}</div>
        <div class="answer-line"><strong>Correct answer:</strong> ${escapeHtml(choiceText(question, answer.correctAnswers))}</div>
        <p><strong>Concept:</strong> ${escapeHtml(question.objective)} expects you to connect the scenario to ${escapeHtml(question.topic.toLowerCase())}${tags ? ` using ${escapeHtml(tags)} reasoning` : ""}.</p>
        <p><strong>Explanation:</strong> ${escapeHtml(question.explanation)}</p>
      </article>
    `;
  }

  async function init() {
    try {
      state.progress = { ...createEmptyProgress(), ...safeJsonRead(STORAGE.progress, createEmptyProgress()) };
      state.settings = { ...DEFAULT_SETTINGS, ...safeJsonRead(STORAGE.settings, DEFAULT_SETTINGS) };
      const response = await fetch(BANK_URL, { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const bank = await response.json();
      state.metadata = bank.metadata || {};
      state.questions = (bank.questions || []).filter((question) => question.id && question.stem && Array.isArray(question.choices));
      state.objectives = getObjectiveOptions();
      if (!state.settings.objective) {
        state.settings.objective = state.objectives[0]?.objective || "";
      }
      state.settings = clampSettings(state.settings);
      state.activeQuiz = safeJsonRead(STORAGE.activeQuiz, null);
      if (state.activeQuiz) {
        const validQuestionIds = new Set(state.questions.map((question) => question.id));
        const activeValid = state.activeQuiz.questionIds?.every((id) => validQuestionIds.has(id));
        if (!activeValid) {
          localStorage.removeItem(STORAGE.activeQuiz);
          state.activeQuiz = null;
        }
      }
      state.view = "menu";
      render();
    } catch (error) {
      console.error(error);
      state.view = "error";
      render();
    }
  }

  init();
}());
