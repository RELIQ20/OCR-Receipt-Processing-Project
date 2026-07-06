import { useEffect, useState } from 'react';
import { FaCheck } from 'react-icons/fa';
import { MdEdit } from 'react-icons/md';
import type { ReceiptData, EditState, Status } from '../types/receipt';

interface InboxDetailProps {
	receipt: ReceiptData;
	onSave?: (receipt: ReceiptData) => void;
	onFlagIssue?: (receipt: ReceiptData) => void;
	editable?: boolean;
}

function getConfidenceTone(value: number) {
	if (value < 70) {
		return {
			label: "Low",
			fill: "#ef4444",
			track: "bg-red-50",
			text: "text-red-600",
		};
	}

	if (value < 90) {
		return {
			label: "Medium",
			fill: "#f59e0b",
			track: "bg-amber-50",
			text: "text-amber-600",
		};
	}

	return {
		label: "High",
		fill: "#22c55e",
		track: "bg-emerald-50",
		text: "text-emerald-600",
	};
}

function ConfidenceBar({ label, value }: { label: string; value: number }) {
	const confidenceTone = getConfidenceTone(value);
	const progress = Math.max(0, Math.min(100, value));

	return (
		<div>
			<div className="mb-2 flex items-center justify-between">
				<span className="text-xs font-semibold uppercase tracking-wide text-gray-400">
					{label}
				</span>
				<span className={`text-xs font-semibold ${confidenceTone.text}`}>
					{confidenceTone.label} · {progress}%
				</span>
			</div>
			<div className={`h-2 overflow-hidden rounded-full ${confidenceTone.track}`}>
				<div
					className="h-full rounded-full transition-all"
					style={{ width: `${progress}%`, backgroundColor: confidenceTone.fill }}
				/>
			</div>
		</div>
	);
}

interface StepperStep {
	label: string;
	done: boolean;
}

function ProcessingStepper({ steps }: { steps: StepperStep[] }) {
	const completedCount = steps.filter((s) => s.done).length;
	const activeIndex = Math.min(completedCount, steps.length - 1);
	const currentStep = steps[activeIndex];

	return (
		<div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 sm:px-8 py-3">
			{/* Circle + connector row. Circles are fixed-size flow items; connectors are the
			    only flex-growing elements, so a circle's edge is always exactly where the
			    adjoining connector ends — no absolute math, so it can't drift or overshoot. */}
			<div className="flex items-center mb-1 sm:mb-5">
				{steps.map((step, i) => {
					const isCurrent = i === activeIndex && !step.done;
					const isLast = i === steps.length - 1;
					// A connector fills once the step it leads into is done. Since `done`
					// is always a monotonic prefix, this tracks progress exactly.
					const connectorFilled = !isLast && steps[i + 1].done;

					return (
						<div key={i} className={`relative flex items-center ${isLast ? "shrink-0" : "flex-1"}`}>
							<div
								className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 border-2 transition-colors ${
									step.done
										? "bg-castleton border-castleton"
										: isCurrent
										? "bg-white border-castleton"
										: "bg-white border-gray-200"
								}`}
							>
								{step.done ? (
									<FaCheck size={9} color="white" />
								) : (
									<span
										className={`text-[10px] font-bold ${
											isCurrent ? "text-castleton" : "text-gray-300"
										}`}
									>
										{i + 1}
									</span>
								)}
							</div>

							{!isLast && (
								<div
									className={`flex-1 h-0.5 transition-colors ${
										connectorFilled ? "bg-castleton" : "bg-gray-200"
									}`}
								/>
							)}

							{/* Label centered on the circle's true center (10px = half of w-5),
							    independent of connector length or column width. Hidden on
							    mobile in favor of the single current-step caption below. */}
							<p
								className={`hidden sm:block absolute top-full mt-1 left-2.5 w-20 -translate-x-1/2 text-center text-[10px] leading-tight ${
									step.done || isCurrent ? "font-semibold text-gray-700" : "text-gray-400"
								}`}
							>
								{step.label}
							</p>
						</div>
					);
				})}
			</div>

			<p className="sm:hidden text-center text-[11px] font-medium text-gray-600">
				Step {activeIndex + 1} of {steps.length} · {currentStep.label}
			</p>
		</div>
	);
}

export default function InboxDetail({ receipt, onSave, onFlagIssue, editable = true }: InboxDetailProps) {
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

	useEffect(() => {
		if (!editable) {
			setEditMode(false);
		}
	}, [editable]);

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

	const timeline: StepperStep[] = [
		{
			label: "Received",
			done: true,
		},
		{
			label: "OCR Scan",
			done: receipt.status !== "processing",
		},
		{
			label: "Data Extracted",
			done: receipt.status !== "processing",
		},
		{
			label: "Verified",
			done: receipt.status === "completed",
		},
		{
			label: "Report Ready",
			done: receipt.status === "completed",
		},
	];

	return (
		<div className="flex-1 overflow-y-auto bg-salt">
			<div className="max-w-6xl mx-auto p-6 lg:p-8 space-y-6">
				{/* Header */}
				<div className="flex items-start justify-between">
					<div>
						<h2 className="text-xl font-bold text-castleton">
							{receipt.vendor || "Unknown Vendor"}
						</h2>
						<p className="text-sm text-gray-400 mt-0.5">
							{receipt.date} at {receipt.time}
						</p>
					</div>
					<div className="flex items-center gap-2 mt-1">
						<div
							className="rounded-full px-3 py-1.5 text-xs font-semibold capitalize text-white flex items-center gap-1.5"
							style={{ backgroundColor: tBgFor(receipt.status) }}
						>
							<span className="w-1.5 h-1.5 rounded-full bg-white/80" />
							{receipt.status.replace("_", " ")}
						</div>
					</div>
				</div>

				{/* Stepper */}
				<ProcessingStepper steps={timeline} />

				{/* Main content */}
				<div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
					<div className="lg:col-span-2">
						<div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden h-full">
							<div
								className="h-72 lg:h-full min-h-[22rem] flex items-center justify-center"
								style={{ backgroundColor: tBgFor(receipt.status) }}
							>
								{receipt.receiptImage ? (
									<img
										src={receipt.receiptImage}
										alt={`${receipt.vendor} receipt`}
										className="max-h-full max-w-full object-contain"
									/>
								) : (
									<div className="w-48 h-56 bg-white/95 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center shadow-sm">
										<span className="text-sm font-medium text-gray-500">
											Receipt Image
										</span>
										<span className="mt-1 text-xs text-gray-400 text-center px-4">
											Image preview will appear here
										</span>
									</div>
								)}
							</div>
						</div>
					</div>

					<div className="lg:col-span-3 space-y-6">
						<div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
							<div className="flex items-center justify-between mb-6">
								<h4 className="text-sm font-semibold text-gray-800">Extracted Data</h4>
								{editable && (
									<button
										onClick={() => setEditMode(!editMode)}
										className="text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
									>
										<MdEdit size={12} /> {editMode ? "Cancel" : "Edit"}
									</button>
								)}
							</div>

							<div className="space-y-5">
								<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
												className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-castleton/30 focus:border-castleton"
											/>
										) : (
											<p className="text-sm font-semibold py-2 px-3 bg-gray-50 rounded-lg text-castleton truncate">
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
												className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-castleton/30 focus:border-castleton"
											/>
										) : (
											<p className="text-sm font-semibold py-2 px-3 bg-gray-50 rounded-lg text-castleton">
												${edit.total.toFixed(2)}
											</p>
										)}
									</div>
								</div>

								<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
												className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-castleton/30 focus:border-castleton"
											/>
										) : (
											<p className="text-sm font-semibold py-2 px-3 bg-gray-50 rounded-lg text-castleton">
												${edit.tax.toFixed(2)}
											</p>
										)}
									</div>
								</div>

								<div>
									<label className="text-xs text-gray-400 block mb-2 font-semibold uppercase tracking-wide">
										Items
									</label>

									<div className="rounded-lg border border-gray-100 overflow-hidden">
										<div className="grid grid-cols-3 gap-2 px-1 pb-2 pt-1">
											<span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
												Item
											</span>
											<span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 text-center">
												Qty
											</span>
											<span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 text-right">
												Price
											</span>
										</div>

										<div className="space-y-2">
											{edit.items.map((item, index) => (
												<div key={index} className="grid grid-cols-3 gap-2">
													{editable && editMode ? (
														<>
															<input
																value={item.name}
																onChange={(e) => {
																	const items = [...edit.items];
																	items[index].name = e.target.value;
																	setEdit({ ...edit, items });
																}}
																className="px-2 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-castleton/30 focus:border-castleton"
															/>

															<input
																type="number"
																value={item.quantity}
																onChange={(e) => {
																	const items = [...edit.items];
																	items[index].quantity = Number(e.target.value) || 0;
																	setEdit({ ...edit, items });
																}}
																className="px-2 py-1.5 text-sm border border-gray-200 rounded text-center focus:outline-none focus:ring-2 focus:ring-castleton/30 focus:border-castleton"
															/>

															<input
																type="number"
																value={item.price}
																onChange={(e) => {
																	const items = [...edit.items];
																	items[index].price = Number(e.target.value) || 0;
																	setEdit({ ...edit, items });
																}}
																className="px-2 py-1.5 text-sm border border-gray-200 rounded text-right focus:outline-none focus:ring-2 focus:ring-castleton/30 focus:border-castleton"
															/>
														</>
													) : (
														<>
															<p className="col-span-1 truncate text-sm font-semibold py-2 px-3 bg-gray-50 rounded-lg text-gray-700">
																{item.name || "—"}
															</p>
															<p className="text-sm font-semibold py-2 px-3 bg-gray-50 rounded-lg text-gray-700 text-center">
																{item.quantity}
															</p>
															<p className="text-sm font-semibold py-2 px-3 bg-gray-50 rounded-lg text-gray-700 text-right">
																${item.price.toFixed(2)}
															</p>
														</>
													)}
												</div>
											))}
										</div>
									</div>
								</div>

								<div className="pt-4 border-t border-gray-100">
									<ConfidenceBar
										label="Overall AI confidence"
										value={receipt.confidence}
									/>
								</div>
							</div>
						</div>

						<div className="flex gap-3">
							<button
								onClick={handleSave}
								className="flex-1 py-3 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 hover:opacity-90 transition-opacity bg-castleton shadow-sm"
							>
								{editMode ? (
									<>
										<MdEdit size={14} /> Save Corrections
									</>
								) : (
									<>
										<FaCheck size={14} /> Mark as Correct
									</>
								)}
							</button>
							<button
								onClick={() => onFlagIssue?.(receipt)}
								className="px-5 py-3 rounded-xl text-sm border border-gray-200 hover:bg-gray-50 text-gray-600 transition-colors font-medium"
							>
								Flag Issue
							</button>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}