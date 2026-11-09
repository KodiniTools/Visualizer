/**
 * Ausschnitt von DedicatedWorkerGlobalScope. tsconfig.app nutzt die DOM-Lib
 * (nicht WebWorker), dort ist `self` ein Window mit anderer postMessage-Signatur.
 * Die Worker greifen daher über `self as unknown as WorkerScope<…>` zu.
 */
export interface WorkerScope<In> {
  onmessage: ((e: MessageEvent<In>) => unknown) | null
  postMessage(message: unknown, transfer?: Transferable[]): void
}
