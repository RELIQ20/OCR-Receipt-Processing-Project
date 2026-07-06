import { useEffect, useState } from 'react';
import { FaCheck } from 'react-icons/fa';
import { MdEdit } from 'react-icons/md';
import type { ReceiptData, EditState, Status } from '../types/receipt';

interface InboxDetailProps {
	receipt: ReceiptData;
	onSave?: (receipt: ReceiptData) => void;
	onFlagIssue?: (receipt: ReceiptData) => void;
}

function ConfidenceBar({ label, value }: { label: string; value: number }) {
	return (
		<div>
			<div className="mb-2 flex items-center justify-between">
				<span className="text-xs font-semibold uppercase tracking-wide text-gray-400">
					{label}
				</span>
				<span className="text-xs font-semibold text-gray-500">{value}%</span>
			</div>
			<div className="h-2 overflow-hidden rounded-full bg-gray-100">
				<div
					className="h-full rounded-full transition-all"
					style={{ width: `${value}%`, backgroundColor: "bg-castleton" }}
				/>
			</div>
		</div>
	);
}

export default function InboxDetail({ receipt, onSave, onFlagIssue }: InboxDetailProps) {
	const [editMode, setEditMode] = useState(false);
	const [edit, setEdit] = useState<EditState>({
		vendor: receipt.vendor,
		total: receipt.total,
		tax: receipt.tax,
		items: receipt.items.map((item) => ({ ...item })),
		date: receipt.date,
		time: receipt.time,
	});

	useEffect(() => {
		setEditMode(false);
		setEdit({
			vendor: receipt.vendor,
			total: receipt.total,
			tax: receipt.tax,
			items: receipt.items.map((item) => ({ ...item })),
			date: receipt.date,
			time: receipt.time,
		});
	}, [receipt]);

	const tBgFor = (s: Status) =>
		s === "completed" ? "bg-castleton" : s === "for_review" ? "bg-saffaron" : "bg-sea";

	const handleSave = () => {
		const updatedReceipt: ReceiptData = {
			...receipt,
			vendor: edit.vendor,
			items: edit.items.map((item) => ({ ...item })),
			total: edit.total,
			tax: edit.tax,
			date: edit.date,
			time: edit.time,
		};

		setEdit(updatedReceipt);
		setEditMode(false);
		onSave?.(updatedReceipt);
	};

	const timeline = [
		{
			label: "Receipt received from WhatsApp",
			done: true,
		},
		{
			label: "OCR processing completed",
			done: receipt.status !== "processing",
		},
		{
			label: "Receipt data extracted",
			done: receipt.status !== "processing",
		},
		{
			label: "Receipt data verified",
			done: receipt.status === "completed",
		},
		{
			label: "Receipt report generated",
			done: receipt.status === "completed",
		},
	];

	return (
		<div className="flex-1 overflow-y-auto bg-salt">
			<div className="p-6">
				<div className="flex items-start justify-between mb-6">
					<div>
						<h2 className="text-lg font-bold" style={{ color: "text-castleton" }}>{receipt.vendor || "Unknown Vendor"}</h2>
						<p className="text-sm text-gray-400 mt-0.5">{receipt.date} at {receipt.time}</p>
					</div>
					<div className="flex items-center gap-2 mt-1">
						<div className="rounded-full px-3 py-1 text-xs font-semibold capitalize text-white" style={{ backgroundColor: tBgFor(receipt.status) }}>
							{receipt.status.replace("_", " ")}
						</div>
					</div>
				</div>

				<div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
					<div className="lg:col-span-2 space-y-4">
						<div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
							<div
								className="h-64 flex items-center justify-center"
								style={{ backgroundColor: tBgFor(receipt.status) }}
							>
								{receipt.receiptImage ? (
									<img
										src={receipt.receiptImage}
										alt={`${receipt.vendor} receipt`}
										className="max-h-full max-w-full object-contain"
									/>
								) : (
									<div className="w-48 h-56 bg-white border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center shadow-sm">
										<span className="text-sm font-medium text-gray-500">
											Receipt Image
										</span>
										<span className="mt-1 text-xs text-gray-400">
											Image preview will appear here
										</span>
									</div>
								)}
							</div>
						</div>

						<div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
							<h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-4">Processing Timeline</h4>
							<div className="space-y-3.5">
								{timeline.map((step, i) => (
									<div key={i} className="flex items-center gap-3">
										<div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${step.done ? "bg-emerald-500" : "bg-gray-200"}`}>
											{step.done ? <FaCheck size={10} color="white"/> : <div className="w-2 h-2 rounded-full bg-gray-400"/>}
										</div>
										<p className={`text-xs flex-1 ${step.done ? "text-gray-700" : "text-gray-400"}`}>{step.label}</p>
									</div>
								))}
							</div>
						</div>
					</div>

					<div className="lg:col-span-3 space-y-4">
						<div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
							<div className="flex items-center justify-between mb-5">
								<h4 className="text-sm font-semibold">Extracted Data</h4>
								<button onClick={() => setEditMode(!editMode)}
									className="text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
									<MdEdit size={12}/> {editMode ? "Cancel" : "Edit"}
								</button>
							</div>

							<div className="space-y-5">
								<div>
									<label className="text-xs text-gray-400 block mb-1.5 font-semibold uppercase tracking-wide">
										Vendor Name
									</label>

									{editMode ? (
										<input
											value={edit.vendor}
											onChange={(e) =>
												setEdit({ ...edit, vendor: e.target.value })
											}
											className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none"
										/>
									) : (
										<p
											className="text-sm font-semibold py-2 px-3 bg-gray-50 rounded-lg"
											style={{ color: "text-castleton" }}
										>
											{edit.vendor || "—"}
										</p>
									)}
								</div>

								<div>
									<label className="text-xs text-gray-400 block mb-1.5 font-semibold uppercase tracking-wide">
										Total Amount
									</label>

									{editMode ? (
										<input
											type="number"
											value={edit.total}
											onChange={(e) =>
												setEdit({ ...edit, total: Number(e.target.value) || 0 })
											}
											className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none"
										/>
									) : (
										<p
											className="text-sm font-semibold py-2 px-3 bg-gray-50 rounded-lg"
											style={{ color: "text-castleton" }}
										>
											${edit.total.toFixed(2)}
										</p>
									)}
								</div>

								<div>
									<label className="text-xs text-gray-400 block mb-1.5 font-semibold uppercase tracking-wide">
										Tax
									</label>

									{editMode ? (
										<input
											type="number"
											value={edit.tax}
											onChange={(e) =>
												setEdit({ ...edit, tax: Number(e.target.value) || 0 })
											}
											className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none"
										/>
									) : (
										<p
											className="text-sm font-semibold py-2 px-3 bg-gray-50 rounded-lg"
											style={{ color: "text-castleton" }}
										>
											${edit.tax.toFixed(2)}
										</p>
									)}
								</div>

								<div>
									<label className="text-xs text-gray-400 block mb-1.5 font-semibold uppercase tracking-wide">
										Items
									</label>

									<div className="space-y-2">
										{edit.items.map((item, index) => (
											<div key={index} className="grid grid-cols-3 gap-2">
												<input
													value={item.name}
													onChange={(e) => {
														const items = [...edit.items];
														items[index].name = e.target.value;
														setEdit({ ...edit, items });
													}}
													className="px-2 py-1 text-sm border rounded"
												/>

												<input
													type="number"
													value={item.quantity}
													onChange={(e) => {
														const items = [...edit.items];
														items[index].quantity = Number(e.target.value) || 0;
														setEdit({ ...edit, items });
													}}
													className="px-2 py-1 text-sm border rounded"
												/>

												<input
													type="number"
													value={item.price}
													onChange={(e) => {
														const items = [...edit.items];
														items[index].price = Number(e.target.value) || 0;
														setEdit({ ...edit, items });
													}}
													className="px-2 py-1 text-sm border rounded"
												/>
											</div>
										))}
									</div>
								</div>

								<div className="pt-2">
									<ConfidenceBar
										label="Overall AI confidence"
										value={receipt.confidence}
									/>
								</div>
							</div>
						</div>

						<div className="flex gap-3">
							<button onClick={handleSave}
								className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
								style={{backgroundColor:"bg-castleton"}}>
								{editMode ? <><MdEdit size={14}/> Save Corrections</> : <><FaCheck size={14}/> Mark as Correct</>}
							</button>
							<button onClick={() => onFlagIssue?.(receipt)} className="px-4 py-2.5 rounded-xl text-sm border border-gray-200 hover:bg-gray-50 text-gray-600 transition-colors font-medium">
								Flag Issue
							</button>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
