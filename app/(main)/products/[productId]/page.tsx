export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { tasks } from "@/db/schema";
import { eq, and, ne } from "drizzle-orm";
import { ProductHub, type ProductId, type ProductTask } from "@/components/dashboard/cr-task-dashboard/ProductHub";
import { MOCK_PRODUCT_TASKS } from "@/lib/mock-cr-data";

const VALID_PRODUCTS: ProductId[] = ["carbon-comp-fr", "carbon-comp-sp", "carbon-comp-it", "mrh"];

export default async function ProductHubPage({ params }: { params: Promise<{ productId: string }> }) {
  const { productId } = await params;
  if (!VALID_PRODUCTS.includes(productId as ProductId)) notFound();
  const typedProductId = productId as ProductId;

  let mine: ProductTask[] = MOCK_PRODUCT_TASKS[typedProductId]?.mine ?? [];
  let theirs: ProductTask[] = MOCK_PRODUCT_TASKS[typedProductId]?.theirs ?? [];

  if (db) {
    const mineRows = await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.productId, typedProductId), eq(tasks.assignee, "Me")));
    const theirsRows = await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.productId, typedProductId), ne(tasks.assignee, "Me")));

    const toCard = (r: typeof mineRows[number]): ProductTask => ({
      id: r.id,
      title: r.title,
      assignee: r.assignee,
      status: r.status,
      dueDate: r.dueDate ? r.dueDate.toISOString().slice(0, 10) : null,
      priority: r.priority,
      crSourceTitle: r.crSourceTitle,
      crDate: r.crDate.toISOString().slice(0, 10),
    });

    mine = mineRows.map(toCard);
    theirs = theirsRows.map(toCard);
  }

  return <ProductHub productId={typedProductId} myTasks={mine} interlocutorTasks={theirs} />;
}
