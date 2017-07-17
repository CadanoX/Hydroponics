#include <iostream>
#include "v3_0/BlackUART/BlackUART.h"

int main()
{
	BlackLib::BlackUART myUart(BlackLib::UART1,
								BlackLib::Baud9600,
								BlackLib::ParityEven,
								BlackLib::StopOne,
								BlackLib::Char8 );

	myUart.open( BlackLib::ReadWrite | BlackLib::NonBlock);

	std::string testMessage = "This is uart test message.";
	std::cout << myUart.transfer(testMessage, 40000);

return 0;
}