import Link from "next/link";
import { notFound } from "next/navigation";
import { getMemberContext } from "@/lib/site/member";
import { getEbdLesson } from "@/lib/ebd";
import { Sym } from "@/components/ui/primitives";
import { LessonNotes } from "./LessonNotes";

export const revalidate = 86400;

export default async function LessonPage({
  params,
}: PageProps<"/igreja/[slug]/membro/ebd/[key]">) {
  const { slug, key } = await params;
  const ctx = await getMemberContext(slug);

  const [lesson, { data: note }] = await Promise.all([
    getEbdLesson(key),
    ctx.supabase
      .from("lesson_notes")
      .select("content")
      .eq("org_id", ctx.org.id)
      .eq("user_id", ctx.user.id)
      .eq("lesson_key", key)
      .maybeSingle(),
  ]);
  if (!lesson) notFound();

  return (
    <div className="space-y-5">
      <Link
        href={`/igreja/${slug}/membro/ebd`}
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <Sym name="chevron_left" className="text-[16px]" /> Lições
      </Link>

      <div>
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight">
          {lesson.title}
        </h1>
        {lesson.date && (
          <p className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">
            {lesson.date}
          </p>
        )}
      </div>

      <article
        className="lesson-body card p-5"
        dangerouslySetInnerHTML={{ __html: lesson.html }}
      />

      <LessonNotes slug={slug} lessonKey={key} initial={note?.content ?? ""} />

      <p className="text-center text-xs text-muted-foreground">
        Conteúdo de estudantesdabiblia.com.br (Lições CPAD)
      </p>
    </div>
  );
}
