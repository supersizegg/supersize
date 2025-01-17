import { useBuddyLink } from 'buddy.link'
import { useWallet } from '@solana/wallet-adapter-react'
import { useCallback, useState, useRef } from 'react'
import React from 'react'

const Invite = ({ textContent = "Sign Up" }: { textContent?: string; }) => {
  const [isCreating, setIsCreating] = useState(false) //Control loading state, prevent duplicate clicks
  const wallet = useWallet()

  const retrievedUser = localStorage.getItem('user');
  const myUsername = wallet.toString().slice(0,12);

  const username = useRef(myUsername);

  if(retrievedUser){
      username.current = JSON.parse(retrievedUser).name;
  }
  //console.log(username.current);
  const { create, member, status } = useBuddyLink()

  // const IsSolBalanceAboveMinimum = useCallback(async () => {
  //   return (await (getBalance(PublicKey.default) || 0)) >= 0.03
  // }, [getBalance])

  const handleInit = useCallback(async () => {
    console.log('status')
    if (!status?.init) return

    setIsCreating(true)
    try {
      console.log('created with',  username.current);
      await create({overrideMemberName: username.current})
      //console.log(`buddy.init results`, results);
      return true
    } catch (e) {
      console.log(`buddy.init error`, e)
    } finally {
      setIsCreating(false)
    }
  }, [status, create, username])

  if (!wallet.connected) {
    // Can make this a wallet connect button in this state
    return (
      <button
        className="h-10 pt-1 bg-gradient-to-r from-gray-300 to-gray-400 text-boost-navy-background text-lg rounded-md font-avenir-bold active:scale-95 uppercase px-4 text-nowrap"
        onClick={() => null}
        disabled={true}>
        Wallet not connected
      </button>
    )
  }
  // else if (!IsSolBalanceAboveMinimum) {
  //   return (
  //     <button
  //       className="h-10 pt-1 bg-gradient-to-r from-gray-300 to-gray-400 text-boost-navy-background text-lg rounded-md font-avenir-bold active:scale-95 uppercase px-4 text-nowrap"
  //       onClick={() => null}
  //       disabled={true}>
  //       SOL Balance required
  //     </button>
  //   )
  // }
  else {
    return (
      <>
        {member && member?.length > 0 ? (
          <div
            className="h-10 pt-1 bg-gradient-to-r from-gray-300 to-gray-400 text-boost-navy-background text-lg rounded-md font-avenir-bold active:scale-95 uppercase px-4 text-nowrap"
            onClick={() => null}>
            Already Joined
          </div>
        ) : (
          <div
            className="h-10 pt-1 bg-boost-secondary-yellow text-boost-navy-background text-sm rounded-md font-avenir-bold active:scale-95 uppercase px-4 text-nowrap cursor-pointer"
            onClick={() => {if(!isCreating){ handleInit()}}} style={{cursor: "pointer"}}>
            {textContent}
          </div>
        )}
      </>
    )
  }
}

export default Invite