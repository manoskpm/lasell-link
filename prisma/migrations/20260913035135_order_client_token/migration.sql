-- 결제창 1회분 토큰: 더블클릭·새로고침으로 같은 주문이 두 번 들어오는 것을 막음
ALTER TABLE "Order" ADD COLUMN "clientToken" TEXT;
CREATE UNIQUE INDEX "Order_clientToken_key" ON "Order"("clientToken");
