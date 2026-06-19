import Sidebar from '@/components/sidebar'

export default function EStatementPage() {
  return (
    <div className="min-h-screen bg-bg-light font-geist p-0">
      <div className="flex min-h-screen">
        <Sidebar />

        <main className="flex-1 p-12 text-black">
          <div className="mb-10 flex items-center justify-between">
            <h2 className="text-2xl font-semibold">E-Statement</h2>
            <div className="flex items-center gap-3">
              <button className="topbar-icon" aria-label="search">
                <img src="/search.png" alt="search" />
              </button>
              <button className="topbar-icon" aria-label="notifications">
                <img src="/notification.png" alt="notifications" />
              </button>
              <div className="size-12 overflow-hidden rounded-full border-2 border-gray-200">
                <img
                  src="/avatar.png"
                  alt="avatar"
                  className="size-full bg-white object-cover"
                />
              </div>
            </div>
          </div>

          <form className="rounded-[32px] bg-white px-10 py-8 text-black shadow-[0_1px_3px_0_rgba(0,0,0,0.30),0_4px_8px_3px_rgba(0,0,0,0.15)]">
            <label
              htmlFor="statement-account-number"
              className="grid items-end gap-6 text-xl md:grid-cols-[auto_1fr]"
            >
              <span>Enter account number:</span>
              <input
                id="statement-account-number"
                inputMode="numeric"
                className="min-w-0 border-0 border-b border-black bg-transparent px-2 py-1 text-xl text-black outline-none"
              />
            </label>
          </form>

          <section
            aria-label="Bank statement preview"
            className="mt-6 min-h-[560px] bg-[#e7e7e7] px-7 py-9 text-black"
          >
            <div className="max-w-full">
              <img
                src="/loginlogo.png"
                alt="Nova Bank"
                className="size-[86px] rounded-full object-cover"
              />

              <div className="mt-5 text-sm leading-tight">
                <h2 className="font-bold">Bank Statement</h2>
                <dl>
                  <div>
                    <dt className="inline">Account Holder:</dt>
                    <dd className="inline" />
                  </div>
                  <div>
                    <dt className="inline">Account Number:</dt>
                    <dd className="inline" />
                  </div>
                  <div>
                    <dt className="inline">Statement Period:</dt>
                    <dd className="inline"> &ndash;</dd>
                  </div>
                  <div>
                    <dt className="inline">Branch:</dt>
                    <dd className="inline" />
                  </div>
                </dl>
              </div>

              <div className="mt-9 text-sm">
                <h3 className="font-bold">Account Summary</h3>
                <table className="mt-9 w-full table-fixed border-collapse text-left">
                  <thead>
                    <tr>
                      <th className="pr-4 font-normal">Opening Balance</th>
                      <th className="pr-4 font-normal">Total Credits</th>
                      <th className="pr-4 font-normal">Total Debits</th>
                      <th className="font-normal">Closing Balance</th>
                    </tr>
                  </thead>
                  {/* <tbody>
                    <tr>
                      <td className="h-8" colSpan={4} />
                    </tr>
                  </tbody> */}
                </table>
              </div>

              <div className="mt-10 border-t border-black pt-9">
                <h3 className="text-sm font-bold">Transaction Details</h3>

                <div className="mt-5 overflow-x-auto">
                  <table className="w-full min-w-[760px] table-fixed border-collapse text-left text-sm">
                    <thead>
                      <tr className="border-b border-black">
                        <th className="w-[13%] pb-3 font-normal">Date</th>
                        <th className="w-[22%] pb-3 font-normal">
                          Description
                        </th>
                        <th className="w-[18%] pb-3 font-normal">
                          Reference ID
                        </th>
                        <th className="w-[15%] pb-3 font-normal">Debit(+)</th>
                        <th className="w-[16%] pb-3 font-normal">Credit(-)</th>
                        <th className="w-[16%] pb-3 font-normal">Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="h-10 pt-3" colSpan={6} />
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  )
}
