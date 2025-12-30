const WhatsappButton: React.FC = () => {
  const WhatsappNumber = import.meta.env.VITE_WHATSAPP_NUMBER || ''
  const whatsappText = "Estoy%20interesado%20en%20conocer%20m%C3%A1s%20de%20sus%20servicios."

  return (
    <div
      id="whatsapp-button"
      className="btn-whatsapp-pulse-border fixed bottom-2 right-2 z-50 grid place-items-center rounded-full bg-green-600 shadow-md transition duration-300 ease-in-out hover:-translate-y-1 md:bottom-6 md:right-6 print:hidden"
    >
      <a
        href={`https://wa.me/${WhatsappNumber}?text=${whatsappText}`}
        target="_blank"
        rel="noopener noreferrer"
        className="block p-3 relative"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="36"
          height="36"
          viewBox="0 0 15.286 15.411"
        >
          <g transform="translate(-1.69 0)">
            <path
              d="M8.959.009A7.646,7.646,0,0,0,2.522,11.114l-.811,3.939a.3.3,0,0,0,.36.35l3.86-.914A7.644,7.644,0,1,0,8.959.009Zm4.605,11.866A5.988,5.988,0,0,1,6.67,13l-.538-.268L3.766,13.3l.5-2.418L4,10.36A5.99,5.99,0,0,1,5.1,3.412a5.985,5.985,0,1,1,8.463,8.463Z"
              fill="#FAFEFF"
            />
            <path
              d="M112.141,112.759l-1.48-.425a.552.552,0,0,0-.546.144l-.362.369a.539.539,0,0,1-.586.124,7.9,7.9,0,0,1-2.55-2.248.539.539,0,0,1,.043-.6l.316-.369a.552.552,0,0,0,.068-.561l-.623-1.409a.552.552,0,0,0-.862-.2,2.49,2.49,0,0,0-.963,1.469c-.105,1.037.34,2.345,2.022,3.915,1.943,1.814,3.5,2.053,4.513,1.808a2.49,2.49,0,0,0,1.324-1.154A.552.552,0,0,0,112.141,112.759Z"
              transform="translate(-99.098 -103.458)"
              fill="#FAFEFF"
            />
          </g>
        </svg>
        <span className="absolute -right-0 -top-2 rounded-full bg-orange-500 p-0.5 px-2 text-sm text-orange-50">1</span>
      </a>
    </div>
  );
};

export default WhatsappButton;
