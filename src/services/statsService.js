import { supabase } from "../utils/supabase-client.js";

export const getStats = async () => {
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  const [{ count: activeUsers }, { count: gamesCovered }, { count: totalCodes }] = await Promise.all([
    supabase.from("players").select("*", { count: "exact", head: true }).gte("last_activity", oneWeekAgo.toISOString()),
    supabase.from("games").select("*", { count: "exact", head: true }),
    supabase.from("codes").select("*", { count: "exact", head: true }),
  ]);

  return {
    activeUsers: activeUsers ?? 0,
    gamesCovered: gamesCovered ?? 0,
    totalCodes: totalCodes ?? 0,
  };
};

export const getPlayerStats = async (player_id) => {
  const now = new Date();
  const thisWeekStart = new Date(now);
  thisWeekStart.setHours(0, 0, 0, 0);
  thisWeekStart.setDate(now.getDate() - now.getDay()); // Sunday start

  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const lastWeek = new Date(now);
  lastWeek.setDate(now.getDate() - 7);

  const lastMonth = new Date(now);
  lastMonth.setMonth(now.getMonth() - 1);

  const [{ count: totalGamesAdded }, { count: totalSubmissions }, { count: totalPlayersAdded }] = await Promise.all([
    supabase.from("games").select("*", { count: "exact", head: true }).eq("added_by", player_id),
    supabase.from("submissions").select("*", { count: "exact", head: true }).eq("submitted_by", player_id),
    supabase.from("players").select("*", { count: "exact", head: true }).eq("added_by", player_id),
  ]);

  const [{ data: firstGameData }, { data: firstSubmissionData }, { data: firstPlayerData }] = await Promise.all([
    supabase.from("games").select("created_at").eq("added_by", player_id).order("created_at", { ascending: true }).limit(1),
    supabase
      .from("submissions")
      .select("created_at")
      .eq("submitted_by", player_id)
      .order("created_at", { ascending: true })
      .limit(1),
    supabase.from("players").select("created_at").eq("added_by", player_id).order("created_at", { ascending: true }).limit(1),
  ]);

  const firstGameDate = firstGameData?.[0]?.created_at ? new Date(firstGameData[0].created_at) : now;
  const firstSubmissionDate = firstSubmissionData?.[0]?.created_at ? new Date(firstSubmissionData[0].created_at) : now;
  const firstPlayerDate = firstPlayerData?.[0]?.created_at ? new Date(firstPlayerData[0].created_at) : now;

  const weeksSinceFirstGame = Math.max(1, (now.getTime() - firstGameDate.getTime()) / (7 * 24 * 60 * 60 * 1000));
  const monthsSinceFirstGame = Math.max(
    1,
    now.getMonth() - firstGameDate.getMonth() + 12 * (now.getFullYear() - firstGameDate.getFullYear())
  );

  const weeksSinceFirstSubmission = Math.max(1, (now.getTime() - firstSubmissionDate.getTime()) / (7 * 24 * 60 * 60 * 1000));
  const monthsSinceFirstSubmission = Math.max(
    1,
    now.getMonth() - firstSubmissionDate.getMonth() + 12 * (now.getFullYear() - firstSubmissionDate.getFullYear())
  );

  const weeksSinceFirstPlayer = Math.max(1, (now.getTime() - firstPlayerDate.getTime()) / (7 * 24 * 60 * 60 * 1000));
  const monthsSinceFirstPlayer = Math.max(
    1,
    now.getMonth() - firstPlayerDate.getMonth() + 12 * (now.getFullYear() - firstPlayerDate.getFullYear())
  );

  const [
    { count: gamesThisWeek },
    { count: gamesLastWeek },
    { count: gamesThisMonth },
    { count: gamesLastMonth },
    { count: submissionsThisWeek },
    { count: submissionsLastWeek },
    { count: submissionsThisMonth },
    { count: submissionsLastMonth },
    { count: pending },
    { count: approved },
    { count: rejected },
    { count: submissionsUpdatedLastWeek },
    { count: submissionsUpdatedLastMonth },
    { count: playersThisWeek },
    { count: playersLastWeek },
    { count: playersThisMonth },
    { count: playersLastMonth },
    { data: lastGameAddedData },
    { data: lastSubmissionData },
    { data: lastPlayerAddedData },
  ] = await Promise.all([
    supabase
      .from("games")
      .select("*", { count: "exact", head: true })
      .eq("added_by", player_id)
      .gte("created_at", thisWeekStart.toISOString()),
    supabase
      .from("games")
      .select("*", { count: "exact", head: true })
      .eq("added_by", player_id)
      .gte("created_at", lastWeek.toISOString()),
    supabase
      .from("games")
      .select("*", { count: "exact", head: true })
      .eq("added_by", player_id)
      .gte("created_at", thisMonthStart.toISOString()),
    supabase
      .from("games")
      .select("*", { count: "exact", head: true })
      .eq("added_by", player_id)
      .gte("created_at", lastMonth.toISOString()),

    supabase
      .from("submissions")
      .select("*", { count: "exact", head: true })
      .eq("submitted_by", player_id)
      .gte("created_at", thisWeekStart.toISOString()),
    supabase
      .from("submissions")
      .select("*", { count: "exact", head: true })
      .eq("submitted_by", player_id)
      .gte("created_at", lastWeek.toISOString()),
    supabase
      .from("submissions")
      .select("*", { count: "exact", head: true })
      .eq("submitted_by", player_id)
      .gte("created_at", thisMonthStart.toISOString()),
    supabase
      .from("submissions")
      .select("*", { count: "exact", head: true })
      .eq("submitted_by", player_id)
      .gte("created_at", lastMonth.toISOString()),

    supabase
      .from("submissions")
      .select("*", { count: "exact", head: true })
      .eq("submitted_by", player_id)
      .eq("status", "pending"),
    supabase
      .from("submissions")
      .select("*", { count: "exact", head: true })
      .eq("submitted_by", player_id)
      .eq("status", "approved"),
    supabase
      .from("submissions")
      .select("*", { count: "exact", head: true })
      .eq("submitted_by", player_id)
      .eq("status", "rejected"),

    supabase
      .from("submissions")
      .select("*", { count: "exact", head: true })
      .eq("submitted_by", player_id)
      .gte("updated_at", lastWeek.toISOString()),
    supabase
      .from("submissions")
      .select("*", { count: "exact", head: true })
      .eq("submitted_by", player_id)
      .gte("updated_at", lastMonth.toISOString()),

    supabase
      .from("players")
      .select("*", { count: "exact", head: true })
      .eq("added_by", player_id)
      .gte("created_at", thisWeekStart.toISOString()),
    supabase
      .from("players")
      .select("*", { count: "exact", head: true })
      .eq("added_by", player_id)
      .gte("created_at", lastWeek.toISOString()),
    supabase
      .from("players")
      .select("*", { count: "exact", head: true })
      .eq("added_by", player_id)
      .gte("created_at", thisMonthStart.toISOString()),
    supabase
      .from("players")
      .select("*", { count: "exact", head: true })
      .eq("added_by", player_id)
      .gte("created_at", lastMonth.toISOString()),

    supabase.from("games").select("created_at").eq("added_by", player_id).order("created_at", { ascending: false }).limit(1),
    supabase
      .from("submissions")
      .select("created_at")
      .eq("submitted_by", player_id)
      .order("created_at", { ascending: false })
      .limit(1),
    supabase.from("players").select("created_at").eq("added_by", player_id).order("created_at", { ascending: false }).limit(1),
  ]);

  return {
    games: {
      total: totalGamesAdded ?? 0,
      lastWeek: gamesLastWeek ?? 0,
      thisWeek: gamesThisWeek ?? 0,
      lastMonth: gamesLastMonth ?? 0,
      thisMonth: gamesThisMonth ?? 0,
      avgPerWeek: totalGamesAdded / weeksSinceFirstGame,
      avgPerMonth: totalGamesAdded / monthsSinceFirstGame,
      lastAdded: lastGameAddedData?.[0]?.created_at ?? null,
    },
    submissions: {
      total: totalSubmissions ?? 0,
      lastWeek: submissionsLastWeek ?? 0,
      thisWeek: submissionsThisWeek ?? 0,
      lastMonth: submissionsLastMonth ?? 0,
      thisMonth: submissionsThisMonth ?? 0,
      avgPerWeek: totalSubmissions / weeksSinceFirstSubmission,
      avgPerMonth: totalSubmissions / monthsSinceFirstSubmission,
      lastCreated: lastSubmissionData?.[0]?.created_at ?? null,
      updatedLastWeek: submissionsUpdatedLastWeek ?? 0,
      updatedLastMonth: submissionsUpdatedLastMonth ?? 0,
      status: {
        pending: pending ?? 0,
        approved: approved ?? 0,
        rejected: rejected ?? 0,
      },
    },
    players: {
      total: totalPlayersAdded ?? 0,
      lastWeek: playersLastWeek ?? 0,
      thisWeek: playersThisWeek ?? 0,
      lastMonth: playersLastMonth ?? 0,
      thisMonth: playersThisMonth ?? 0,
      avgPerWeek: totalPlayersAdded / weeksSinceFirstPlayer,
      avgPerMonth: totalPlayersAdded / monthsSinceFirstPlayer,
      lastAdded: lastPlayerAddedData?.[0]?.created_at ?? null,
    },
  };
};
