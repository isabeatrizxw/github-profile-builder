import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { DraftEditor } from "@/components/draft-editor";
import { getDraft } from "@/lib/drafts/repository";
import { fetchVerifiedEmails } from "@/lib/github/emails";
import { fetchOwnedPublicRepositories, showcaseRepositories } from "@/lib/github/repositories";
import { readGitHubOrNull } from "@/lib/github/server";
import { requireSession } from "@/lib/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("draftEditor");
  return { title: t("pageTitle") };
}

export default async function DraftPage({ params }: PageProps<"/drafts/[id]">) {
  const { user, accessToken } = await requireSession();
  const { id } = await params;
  const draft = await getDraft(id, user.id);
  if (!draft) notFound();

  // Each is null when GitHub is unavailable: the editor still works, with a notice.
  const [verifiedEmails, repositories] = await Promise.all([
    readGitHubOrNull(() => fetchVerifiedEmails(accessToken), "verified emails"),
    readGitHubOrNull(() => fetchOwnedPublicRepositories(accessToken), "repositories"),
  ]);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
      <DraftEditor
        id={draft.id}
        title={draft.title}
        profile={draft.content.profile}
        readme={draft.content.readme}
        login={user.login}
        avatarUrl={user.avatarUrl}
        verifiedEmails={verifiedEmails}
        // Only what the picker needs crosses to the client. The profile README
        // repository itself is not a project to showcase.
        repositories={
          (repositories && showcaseRepositories(repositories, user.login))
            ?.map(({ fullName, name, description, htmlUrl, language, isFork, isArchived }) => ({
              fullName,
              name,
              description,
              htmlUrl,
              language,
              isFork,
              isArchived,
            })) ??
          null
        }
      />
    </div>
  );
}
