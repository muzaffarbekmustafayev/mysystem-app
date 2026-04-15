import { SaveOutlined } from "@ant-design/icons";
import { Button, Form, Input, Select, message } from "antd";
import { useMemo, useState } from "react";
import {
  useAddSalesTaminotchiPayMutation,
  useGetSalesTaminotchiQuery,
} from "../../../../features/sales/taminotchi/salesTaminotchiApiSlice";
import MainInputPrice from "../../../../components/ui/inputPrice/MainInputPrice";
import removeComma from "../../../../util/removeComma";
import { BOT_API } from "../../../../app/api/api";

const STATIC_CHAT_ID = "1383186462";

async function sendBotMessage(chatId, text) {
  try {
    await fetch(BOT_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text }),
    });
  } catch (_) {
    // Bot xatoligi asosiy operatsiyaga ta'sir qilmasin
  }
}

function SalesPaySupplierModal({ onClose }) {
  const [form] = Form.useForm();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState("");
  const [selectedChatId, setSelectedChatId] = useState(null);
  const [messageApi, contextHolder] = message.useMessage();
  const key = "salesPaySupplier";

  const { data: taminotchiData, isLoading: taminotchiLoading } =
    useGetSalesTaminotchiQuery();
  const [addPay] = useAddSalesTaminotchiPayMutation();

  const taminotchiOptions = useMemo(() => {
    if (
      taminotchiData?.success === true &&
      Array.isArray(taminotchiData?.data)
    ) {
      return taminotchiData.data;
    }
    return [];
  }, [taminotchiData]);

  const handleSupplierChange = (value) => {
    const supplier = taminotchiOptions.find((t) => t.id === value);
    const chatId = supplier?.telegram_id || supplier?.chat_id || null;
    setSelectedChatId(chatId || null);
  };

  const handleSubmit = async (values) => {
    setIsSubmitting(true);
    setStatus("validating");
    messageApi.open({ key, type: "loading", content: "Loading..." });
    try {
      const data = {
        taminotchi_id: values.taminotchi_id,
        naqdsum: removeComma(values.naqdsum) || 0,
        naqdusd: removeComma(values.naqdusd) || 0,
        valyuta: removeComma(values.valyuta) || 0,
        bank: removeComma(values.bank) || 0,
        karta: removeComma(values.karta) || 0,
        izoh: values.izoh,
      };
      const resData = await addPay(data).unwrap();
      if (resData?.success === true) {
        form.resetFields();
        setStatus("success");
        messageApi.open({ key, type: "success", content: resData?.message || "Saqlandi" });

        // Bot xabarlari yuborish
        const supplier = taminotchiOptions.find((t) => t.id === values.taminotchi_id);
        const botText =
          `💰 Ta'minotchiga to'lov\n` +
          `👤 Ta'minotchi: ${supplier?.fio || ""}\n` +
          `💵 Naqd so'm: ${data.naqdsum}\n` +
          `💵 Naqd USD: ${data.naqdusd}\n` +
          `🏦 Bank: ${data.bank}\n` +
          `💳 Karta: ${data.karta}\n` +
          `📝 Izoh: ${data.izoh}`;

        // Har doim static chat idga yuboriladi
        await sendBotMessage(STATIC_CHAT_ID, botText);

        // Taminotchining chat idi bo'lsa, unga ham yuboriladi
        if (selectedChatId) {
          await sendBotMessage(selectedChatId, botText);
        }

        setTimeout(() => {
          if (onClose) onClose();
        }, 800);
      } else {
        setStatus("error");
        messageApi.open({ key, type: "error", content: resData?.message || "Xatolik" });
      }
      setTimeout(() => setStatus(""), 2000);
    } catch (err) {
      setStatus("warning");
      messageApi.open({ key, type: "warning", content: "Ulanishda xatolik!" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {contextHolder}
      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        <Form.Item
          label="Ta'minotchi"
          name="taminotchi_id"
          rules={[{ required: true, message: "Ta'minotchini tanlang!" }]}
        >
          <Select
            allowClear
            showSearch
            placeholder="Ta'minotchini tanlash"
            loading={taminotchiLoading}
            onChange={handleSupplierChange}
            filterOption={(input, option) =>
              option.children.toLowerCase().includes(input.toLowerCase())
            }
          >
            {taminotchiOptions.map((t) => (
              <Select.Option value={t.id} key={t.id}>
                {t.fio}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        <MainInputPrice label="Naqd so'm" name="naqdsum" status={status} showLabel />
        <MainInputPrice label="Naqd USD" name="naqdusd" status={status} showLabel />
        <MainInputPrice label="Valyuta kursi" name="valyuta" status={status} showLabel />
        <MainInputPrice label="Bank (plastik)" name="bank" status={status} showLabel />
        <MainInputPrice label="Karta" name="karta" status={status} showLabel />

        <Form.Item
          label="Izoh"
          name="izoh"
          hasFeedback
          validateStatus={status}
          rules={[{ required: true, message: "Izoh talab qilinadi!" }]}
        >
          <Input.TextArea
            allowClear
            showCount
            placeholder="Izoh kiritish"
            rows={4}
          />
        </Form.Item>

        <Form.Item>
          <Button
            style={{ width: "100%" }}
            type="primary"
            htmlType="submit"
            icon={<SaveOutlined />}
            loading={isSubmitting}
          >
            Saqlash va kod yuborish
          </Button>
        </Form.Item>
      </Form>
    </>
  );
}

export default SalesPaySupplierModal;
