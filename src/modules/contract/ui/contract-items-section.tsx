"use client";
// S08 の内訳項目の区画。ひな形・候補・「その他」からの追加、並べ替え、外すを画面の中だけで行う。
// 一覧は契約のフォームの items に持ち、「保存」を押したときに契約と一緒にサーバーへ送る。
import { useId, useState } from "react";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { zodResolver } from "@hookform/resolvers/zod";
import { GripVertical, X } from "lucide-react";
import { useForm, type UseFieldArrayReturn } from "react-hook-form";
import type { UtilityType } from "@/shared/db/generated/prisma/enums";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/ui/alert-dialog";
import { Button } from "@/shared/ui/button";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/shared/ui/form";
import { Input } from "@/shared/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { cn } from "@/shared/ui/utils";
import { ITEM_CATEGORIES, ITEM_CATEGORY_LABELS, ITEM_TEMPLATES } from "../item-catalog";
import {
  buildTemplateItems,
  findCustomItemNameProblem,
  listAvailableCandidates,
} from "../item-rules";
import { CONTRACT_MESSAGES, customItemSchema, type ContractInput } from "../validation";

// 契約のフォームの items を操作する道具一式。useFieldArray の戻り値をそのまま受け取る。
type ItemsArray = UseFieldArrayReturn<ContractInput, "items">;

// 画面の読み上げで使う、並べ替えの操作説明。dnd-kit の既定は英語のため日本語に差し替える。
const SCREEN_READER_INSTRUCTIONS = {
  draggable:
    "並べ替えるには、スペースキーで項目を持ち上げ、上下の矢印キーで動かし、もう一度スペースキーで置きます。エスケープキーで取り消します。",
};

// 並べ替えの途中経過を読み上げる文言。行の id から項目名を引いて伝える。
function buildAnnouncements(nameOf: (id: string | number) => string): Announcements {
  return {
    onDragStart: ({ active }) => `${nameOf(active.id)}を持ち上げました。`,
    onDragOver: ({ active, over }) =>
      over ? `${nameOf(active.id)}を${nameOf(over.id)}の位置へ動かしました。` : undefined,
    onDragEnd: ({ active, over }) =>
      over ? `${nameOf(active.id)}を${nameOf(over.id)}の位置に置きました。` : undefined,
    onDragCancel: ({ active }) => `${nameOf(active.id)}の並べ替えを取り消しました。`,
  };
}

// 選んだ項目の 1 行。左に並べ替えのつまみ（≡）、項目名と［分類］、右に外すボタン（×）を置く。
function SortableItemRow({
  id,
  name,
  categoryLabel,
  disabled,
  onRemove,
}: {
  id: string;
  name: string;
  categoryLabel: string;
  disabled: boolean;
  onRemove: () => void;
}) {
  // つまみだけでつかめるよう、listeners は ≡ のボタンにだけ渡す。行全体でつかむとスマホで画面を送れなくなるため。
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled, attributes: { roleDescription: "並べ替えできる項目" } });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "flex items-center gap-2 rounded-md border bg-card px-1 py-1",
        isDragging && "relative z-10 border-ring",
      )}
    >
      <Button
        ref={setActivatorNodeRef}
        type="button"
        variant="ghost"
        size="icon"
        aria-label={`${name}を並べ替える`}
        className="cursor-grab touch-none"
        disabled={disabled}
        {...attributes}
        {...listeners}
      >
        <GripVertical aria-hidden />
      </Button>
      <span className="min-w-0 flex-1 text-sm">
        {name} <span className="text-xs text-muted-foreground">［{categoryLabel}］</span>
      </span>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={`${name}を外す`}
        disabled={disabled}
        onClick={onRemove}
      >
        <X aria-hidden />
      </Button>
    </li>
  );
}

// 「その他」の項目名・分類の入力欄と「追加」ボタン。
// 契約のフォームの中に置くため <form> は使わず、別の useForm で入力チェックだけを行う。
function CustomItemForm({
  utilityType,
  itemsArray,
  disabled,
}: {
  utilityType: UtilityType;
  itemsArray: ItemsArray;
  disabled: boolean;
}) {
  const customForm = useForm({
    resolver: zodResolver(customItemSchema),
    defaultValues: { name: "", category: "" as const },
  });
  // 入力チェックを通ったら、一覧の最後に加えて入力欄を空に戻す。
  const handleAdd = customForm.handleSubmit(({ name, category }) => {
    // 一覧や候補との重なりは、今の一覧と種別が要るためここで確かめる。
    const problem = findCustomItemNameProblem(utilityType, name, itemsArray.fields);
    if (problem) {
      customForm.setError("name", {
        message:
          problem === "duplicate"
            ? CONTRACT_MESSAGES.itemNameDuplicate
            : CONTRACT_MESSAGES.itemNameIsCandidate,
      });
      return;
    }
    // スキーマで空文字を弾いているので、category は必ず 6 つの分類のどれかになっている。
    itemsArray.append({ name, category, isCustom: true });
    customForm.reset();
  });
  return (
    <Form {...customForm}>
      <div className="flex items-start gap-2">
        <FormField
          control={customForm.control}
          name="name"
          render={({ field }) => (
            <FormItem className="min-w-0 flex-1">
              <FormControl>
                <Input
                  aria-label="その他の項目名"
                  placeholder="その他（項目名を入力）"
                  autoComplete="off"
                  disabled={disabled}
                  {...field}
                  // Enter で契約全体が保存されないよう止め、代わりに「追加」と同じ動きにする。
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      void handleAdd();
                    }
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={customForm.control}
          name="category"
          render={({ field }) => (
            <FormItem className="w-28">
              <Select value={field.value} onValueChange={field.onChange} disabled={disabled}>
                <FormControl>
                  <SelectTrigger aria-label="その他の分類" className="w-full">
                    <SelectValue placeholder="分類" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {ITEM_CATEGORIES.map((category) => (
                    <SelectItem key={category} value={category}>
                      {ITEM_CATEGORY_LABELS[category]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          onClick={() => void handleAdd()}
        >
          追加
        </Button>
      </div>
    </Form>
  );
}

// S08 の内訳項目の区画。種別が未選択のときは案内の文だけを出す。
export function ContractItemsSection({
  utilityType,
  itemsArray,
  disabled,
}: {
  utilityType: UtilityType | "";
  itemsArray: ItemsArray;
  disabled: boolean;
}) {
  // 選んでいるひな形。種別を変えると区画ごと作り直すので、ここで種別との食い違いは起きない。
  const [templateId, setTemplateId] = useState("");
  // ひな形で一覧を入れ替えてよいかの確認を開いているか。
  const [templateConfirmOpen, setTemplateConfirmOpen] = useState(false);
  // 並べ替えの読み上げ用の要素に付く id を、サーバーとブラウザの描画でそろえる。dnd-kit は既定で連番を使い、ずれるため。
  const dndId = useId();
  // マウス・タッチはつまみを少し動かしてから並べ替えを始め、押しただけで動かないようにする。
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  if (utilityType === "") {
    return <p className="text-sm text-muted-foreground">種別を選ぶと内訳項目を選べます。</p>;
  }

  const { fields, append, remove, move, replace } = itemsArray;
  const candidates = listAvailableCandidates(utilityType, fields);
  // 読み上げで行の id から項目名を引くために使う。
  const nameOf = (id: string | number) => fields.find((field) => field.id === id)?.name ?? "";
  // 選んだひな形の項目だけの一覧に入れ替える。「その他」の項目も含め、今の一覧は引き継がない。
  function applyTemplate() {
    replace(buildTemplateItems(utilityType as UtilityType, templateId));
  }
  // 「選択」を押したときの動き。今の一覧がすべて外れるため、1 件以上あるときは先に確認を出す。
  function handleTemplateSelect() {
    if (fields.length > 0) {
      setTemplateConfirmOpen(true);
      return;
    }
    applyTemplate();
  }
  // 並べ替えを置いた位置に合わせて、一覧の順番を入れ替える。
  function handleDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;
    const from = fields.findIndex((field) => field.id === active.id);
    const to = fields.findIndex((field) => field.id === over.id);
    if (from >= 0 && to >= 0) move(from, to);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <div className="flex gap-2">
          <Select value={templateId} onValueChange={setTemplateId} disabled={disabled}>
            <SelectTrigger aria-label="ひな形" className="min-w-0 flex-1">
              <SelectValue placeholder="ひな形を選ぶ" />
            </SelectTrigger>
            <SelectContent>
              {ITEM_TEMPLATES[utilityType].map((template) => (
                <SelectItem key={template.id} value={template.id}>
                  {template.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {/* ひな形が未選択のときは押せなくする。 */}
          <Button
            type="button"
            variant="outline"
            disabled={disabled || templateId === ""}
            onClick={handleTemplateSelect}
          >
            選択
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          「選択」を押すと、ひな形の内容を表示します。
        </p>
      </div>
      {/* ひな形で入れ替えると今の一覧がすべて外れるため、内訳項目があるときだけ確認する。 */}
      <AlertDialog open={templateConfirmOpen} onOpenChange={setTemplateConfirmOpen}>
        <AlertDialogContent size="sm" aria-describedby={undefined}>
          <AlertDialogHeader>
            <AlertDialogTitle>
              選んだひな形の内訳項目に切り替わります。いま選んでいる内訳項目はすべて外れます。切り替えますか？
            </AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel type="button">キャンセル</AlertDialogCancel>
            <AlertDialogAction type="button" onClick={applyTemplate}>
              切り替える
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {fields.length === 0 ? (
        <p className="text-sm text-muted-foreground">内訳項目が選ばれていません。</p>
      ) : (
        <DndContext
          id={dndId}
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
          accessibility={{
            announcements: buildAnnouncements(nameOf),
            screenReaderInstructions: SCREEN_READER_INSTRUCTIONS,
          }}
        >
          <SortableContext items={fields} strategy={verticalListSortingStrategy}>
            <ul aria-label="選んだ内訳項目" className="flex flex-col gap-1">
              {fields.map((field, index) => (
                <SortableItemRow
                  key={field.id}
                  id={field.id}
                  name={field.name}
                  categoryLabel={ITEM_CATEGORY_LABELS[field.category]}
                  disabled={disabled}
                  onRemove={() => remove(index)}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}

      {/* まだ選んでいない候補だけを並べる。すべて選んだときは見出しだけが残る。 */}
      <div className="flex flex-col gap-1">
        <p className="text-xs text-muted-foreground">候補から追加</p>
        <div className="flex flex-wrap gap-2">
          {candidates.map((candidate) => (
            <Button
              key={candidate.name}
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled}
              onClick={() => append({ ...candidate, isCustom: false })}
            >
              ＋ {candidate.name}
            </Button>
          ))}
        </div>
      </div>

      <CustomItemForm utilityType={utilityType} itemsArray={itemsArray} disabled={disabled} />
    </div>
  );
}
