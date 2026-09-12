import { NewProductForm } from "./NewProductForm";

export default function NewProductPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold">상품 등록</h1>
      <NewProductForm />
    </div>
  );
}
